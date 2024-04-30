import { isError } from "ethers"
import { useMemo, useState } from "react"

import { CHAIN_ID, NETWORKS, TX_STATUS } from "@/constants"
import { useBridgeContext } from "@/contexts/BridgeContextProvider"
import { usePriceFeeContext } from "@/contexts/PriceFeeProvider"
import { useRainbowContext } from "@/contexts/RainbowProvider"
import useBridgeStore from "@/stores/bridgeStore"
import useTxStore from "@/stores/txStore"
import { isValidOffsetTime } from "@/stores/utils"
import { amountToBN, isSepolia, sentryDebug } from "@/utils"

import useGasFee from "./useGasFee"

type TxOptions = {
  value: bigint
  maxFeePerGas?: bigint | null
  maxPriorityFeePerGas?: bigint | null
}

export function useBatchDeposit(props) {
  const { amount: fromTokenAmount, selectedToken } = props
  const { walletCurrentAddress } = useRainbowContext()
  const { networksAndSigners, blockNumbers } = useBridgeContext()
  //   const { enlargedGasLimit: txGasLimit, maxFeePerGas, maxPriorityFeePerGas } = useGasFee(selectedToken, false)
  const { maxFeePerGas, maxPriorityFeePerGas } = useGasFee(selectedToken, false)
  const { addTransaction, addEstimatedTimeMap, removeFrontTransactions, updateTransaction } = useTxStore()
  const { fromNetwork, changeTxResult } = useBridgeStore()
  const { gasLimit, gasPrice } = usePriceFeeContext()

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [sendError, setSendError] = useState<any>()

  const parsedAmount = useMemo(() => {
    if (!fromTokenAmount || !selectedToken) return BigInt(0)
    return amountToBN(fromTokenAmount, selectedToken.decimals)
  }, [fromTokenAmount, selectedToken?.decimals])

  const send = async () => {
    setIsLoading(true)
    let tx
    let currentBlockNumber
    currentBlockNumber = await networksAndSigners[CHAIN_ID.L1].provider.getBlockNumber()
    try {
      if (selectedToken.native) {
        await depositETH()
      } else {
        await depositERC20()
      }
      // start to check tx replacement from current block number
      // TODO: shouldn't add it here(by @ricmoo)
      tx = tx.replaceableTransaction(currentBlockNumber)

      handleTransaction(tx)
      tx.wait()
        .then(receipt => {
          if (receipt?.status === 1) {
            changeTxResult({ code: 1 })
            handleTransaction(tx, {
              fromBlockNumber: receipt.blockNumber,
            })
            const estimatedOffsetTime = (receipt.blockNumber - blockNumbers[0]) * 12 * 1000
            if (isValidOffsetTime(estimatedOffsetTime)) {
              addEstimatedTimeMap(`from_${tx.hash}`, Date.now() + estimatedOffsetTime)
            } else {
              addEstimatedTimeMap(`from_${tx.hash}`, 0)
              sentryDebug(`safe block number: ${blockNumbers[0]}`)
            }
          } else {
            const errorMessage = "due to any operation that can cause the transaction or top-level call to revert"
            setSendError({ code: 0, message: errorMessage })

            // Something failed in the EVM
            // EIP-658
            removeFrontTransactions(tx.hash)
          }
        })
        .catch(error => {
          // TRANSACTION_REPLACED or TIMEOUT
          sentryDebug(error.message)
          if (isError(error, "TRANSACTION_REPLACED")) {
            if (error.cancelled) {
              removeFrontTransactions(tx.hash)
              setSendError("cancel")
            } else {
              const { blockNumber, hash: transactionHash } = error.receipt
              handleTransaction(tx, {
                fromBlockNumber: blockNumber,
                hash: transactionHash,
              })
              if (fromNetwork.isL1) {
                const estimatedOffsetTime = (blockNumber - blockNumbers[0]) * 12 * 1000
                if (isValidOffsetTime(estimatedOffsetTime)) {
                  addEstimatedTimeMap(`from_${transactionHash}`, Date.now() + estimatedOffsetTime)
                } else {
                  addEstimatedTimeMap(`from_${transactionHash}`, 0)
                  sentryDebug(`safe block number: ${blockNumbers[0]}`)
                }
              }
            }
          } else {
            setSendError(error)
            // when the transaction execution failed (status is 0)
            removeFrontTransactions(tx.hash)
          }
        })
        .finally(() => {
          setIsLoading(false)
        })
    } catch (error) {
      setIsLoading(false)
      // reject && insufficient funds(send error)
      if (isError(error, "ACTION_REJECTED")) {
        setSendError("reject")
      } else {
        setSendError(error)
      }
    }
  }

  const handleTransaction = (tx, updateOpts?) => {
    if (updateOpts) {
      updateTransaction(walletCurrentAddress, tx.hash, updateOpts)
      return
    }
    addTransaction(walletCurrentAddress, {
      hash: tx.hash,
      amount: parsedAmount.toString(),
      isL1: fromNetwork.name === NETWORKS[0].name,
      symbolToken: selectedToken.address,
      timestamp: Date.now(),
      initiatedAt: Math.floor(new Date().getTime() / 1000),
      txStatus: TX_STATUS.Unknown,
    })
  }

  const depositETH = async () => {
    const fee = gasPrice * gasLimit
    const options: TxOptions = {
      value: parsedAmount + fee,
    }

    // set maxFeePerGas for testnet
    if (maxFeePerGas && maxPriorityFeePerGas && isSepolia) {
      options.maxFeePerGas = maxFeePerGas
      options.maxPriorityFeePerGas = maxPriorityFeePerGas
    }
    return networksAndSigners[CHAIN_ID.L1].batchBridgeGateway.depositETH(options)
  }

  const depositERC20 = async () => {
    const fee = gasPrice * gasLimit
    const options: TxOptions = {
      value: fee,
    }

    if (maxFeePerGas && maxPriorityFeePerGas && isSepolia) {
      options.maxFeePerGas = maxFeePerGas
      options.maxPriorityFeePerGas = maxPriorityFeePerGas
    }
    return networksAndSigners[CHAIN_ID.L1].gateway["depositERC20(address,uint256,uint256)"](selectedToken.address, parsedAmount, gasLimit, options)
  }

  return {
    send,
    isLoading,
    error: sendError,
  }
}
