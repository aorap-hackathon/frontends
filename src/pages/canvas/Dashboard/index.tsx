import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Helmet } from "react-helmet-async"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { usePrevious } from "react-use"

import { Box } from "@mui/material"
import { styled } from "@mui/system"

import Canvas from "@/components/Canvas"
// import { BADGES_VISIBLE_TYPE } from "@/constants"
import { useCanvasContext } from "@/contexts/CanvasContextProvider"
import { useRainbowContext } from "@/contexts/RainbowProvider"
import useSnackbar from "@/hooks/useSnackbar"
import Badges, { Badge } from "@/pages/canvas/Dashboard/UpgradeDialog/Badges"
import { checkBadgeEligibility, checkIfProfileMinted } from "@/services/canvasService"
import useCanvasStore from "@/stores/canvasStore"
import { requireEnv } from "@/utils"

import LoadingPage from "../loading"
import ActionBox from "./ActionBox"
import BadgeDetailDialog from "./BadgeDetailDialog"
import BadgeWall from "./BadgeWall"
import BadgesDialog from "./BadgesDialog"
import FirstBadgeMask from "./FirstBadgeMask"
import NameDialog from "./NameDialog"
import ReferDialog from "./ReferDialog"
import UpgradeDialog from "./UpgradeDialog"

const Container: any = styled(Box)(({ theme, badgewidth }: any) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "calc(100vh - 6.5rem)",
  backgroundColor: "#101010",
  backgroundImage:
    "linear-gradient(90deg, rgba(255,255,255, 0.3) 1px, transparent 1px), linear-gradient( rgba(255,255,255, 0.3) 1px, transparent 1px)",
  backgroundSize: `${badgewidth}px ${badgewidth}px`,
  backgroundPosition: `calc(50% - ${badgewidth / 2}px) calc(50% - ${badgewidth / 2}px)`,

  "&::before, &::after": {
    content: "''",
    height: "100%",
    position: "absolute",
    top: 0,
    width: "calc((100vw - 100vh + 14rem)/ 2) ",
    zIndex: 42,
  },
  "&::before": {
    background: "linear-gradient(90deg, #101010 50.5%, rgba(16, 16, 16, 0) 100%)",
    left: 0,
  },
  "&::after": {
    background: "linear-gradient(270deg, #101010 50.5%, rgba(16, 16, 16, 0) 100%)",
    right: 0,
  },
  [theme.breakpoints.down("md")]: {
    height: "calc(100vh - 6.2rem)",
  },
}))

type VisibleBadge = Badge & { isValid: boolean }

const Dashboard = props => {
  const { walletCurrentAddress, provider } = useRainbowContext()

  const { address: othersWalletAddress } = useParams()
  const navigate = useNavigate()

  const { unsignedProfileRegistryContract, publicProvider } = useCanvasContext()

  const {
    canvasUsername,
    attachedBadges,
    fetchCurrentCanvasDetail,
    fetchOthersCanvasDetail,
    profileAddress,
    changeProfileDetailLoading,
    profileDetailLoading,
    userBadges,
    changeUpgradeDialog,
    badgeAnimationVisible,
    initialMint,
  } = useCanvasStore()

  const [visibleBadges, setVisibleBadges] = useState<VisibleBadge[]>([])

  const preVisibleBadges = usePrevious(visibleBadges)

  const metadata = {
    title: `Scroll -  ${canvasUsername}'s Canvas`,
    description: "Hi, I've minted Scroll Canvas!",
    image: `${requireEnv("REACT_APP_CANVAS_BACKEND_URI")}/canvas/${othersWalletAddress || walletCurrentAddress}.png`,
  }

  useEffect(() => {
    const fetchVisibleBadges = async () => {
      const checkedBadges = await Promise.allSettled(
        Badges.map(async badge => {
          const isUserBadge = userBadges.some(userBadge => userBadge.badgeContract === badge.badgeContract)
          const preCheckedBadge = preVisibleBadges?.find(item => item.badgeContract === badge.badgeContract)
          if (preCheckedBadge && !isUserBadge) {
            return preCheckedBadge
          }
          let isValidBadge = await checkBadgeEligibility(provider, walletCurrentAddress, badge)

          return {
            ...badge,
            isValid: !isUserBadge && isValidBadge,
          }
        }),
      )
      const filteredBadges = checkedBadges
        .filter((item): item is PromiseFulfilledResult<VisibleBadge> => item.status === "fulfilled" && item.value.isValid)
        .map(item => item.value)
      setVisibleBadges(filteredBadges)
    }
    if (provider && walletCurrentAddress && userBadges?.length) {
      fetchVisibleBadges()
    }
  }, [userBadges, preVisibleBadges, walletCurrentAddress, provider])

  const scrollyAlert = useMemo(() => {
    if (visibleBadges.length) {
      return {
        title: "Mint badges",
        content: "Welcome to Scroll Canvas where you can earn badges across the ecosystem. Mint your badges now!",
        action: () => {
          changeUpgradeDialog(true)
        },
      }
    }
    return {
      title: "Explore badges",
      content: "Welcome to Scroll Canvas where you can earn badges across the ecosystem. Explore protocols offering badges now!",
      action: () => {
        navigate("/ecosystem")
      },
    }
  }, [visibleBadges.length])

  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    if (publicProvider && unsignedProfileRegistryContract && othersWalletAddress) {
      fetchOthers(publicProvider, unsignedProfileRegistryContract, othersWalletAddress)
    }
  }, [publicProvider, unsignedProfileRegistryContract, othersWalletAddress])

  // must have minted
  useEffect(() => {
    if (provider && !othersWalletAddress && profileAddress && !initialMint) {
      fetchCurrent(provider, walletCurrentAddress, profileAddress)
    }
  }, [provider, othersWalletAddress, profileAddress, initialMint])

  const alertWarning = useSnackbar()

  const fetchCurrent = async (provider, walletAddress, profileAddress) => {
    try {
      changeProfileDetailLoading(true)
      const signer = await provider?.getSigner(0)
      await fetchCurrentCanvasDetail(signer, walletAddress, profileAddress)
    } catch (e) {
      alertWarning("Failed to fetch canvas detail 111")
    } finally {
      changeProfileDetailLoading(false)
    }
  }

  const fetchOthers = async (provider, unsignedProfileRegistryContract, othersWalletAddress) => {
    try {
      changeProfileDetailLoading(true)
      await checkAndFetchOthersCanvasDetail(provider, unsignedProfileRegistryContract, othersWalletAddress)
    } catch (e) {
      alertWarning("Failed to fetch canvas detail")
    } finally {
      changeProfileDetailLoading(false)
    }
  }
  const checkAndFetchOthersCanvasDetail = async (provider, unsignedProfileRegistryContract, othersWalletAddress) => {
    const { minted, profileAddress } = await checkIfProfileMinted(unsignedProfileRegistryContract, othersWalletAddress)
    if (!minted) {
      navigate("/404")
      return
    }
    await fetchOthersCanvasDetail(provider, othersWalletAddress, profileAddress)
  }

  const handleResize = useCallback(() => {
    setWindowDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    })
  }, [])

  useEffect(() => {
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [handleResize])

  const gridNum = useMemo(() => (attachedBadges.length > 12 ? 8 : 4), [attachedBadges])

  const badgewidth = useMemo(() => {
    const { width, height } = windowDimensions
    if (width < height - 62) {
      return (width - 62) / gridNum
    } else {
      return (height - 65 - 80) / gridNum
    }
  }, [windowDimensions, gridNum])

  if (othersWalletAddress === walletCurrentAddress) {
    return <Navigate to="/scroll-canvas" replace></Navigate>
  }
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
        <meta name="twitter:title" content={metadata.title} />
        <meta name="twitter:description" content={metadata.description} />
        <meta name="twitter:image" content={metadata.image} />
      </Helmet>
      {!!profileDetailLoading ? (
        <LoadingPage></LoadingPage>
      ) : (
        <Container badgewidth={badgewidth}>
          <BadgeWall badgewidth={badgewidth} gridNum={gridNum} windowDimensions={windowDimensions} />

          <Canvas visible buttonText={scrollyAlert.title} title={scrollyAlert.content} onClick={scrollyAlert.action} canvasId="dashboardCanvas" />
          {!!othersWalletAddress ? (
            <>
              <ActionBox></ActionBox>
              <BadgeDetailDialog />
            </>
          ) : (
            <>
              <ActionBox mintableBadgeCount={visibleBadges.length} />
              <NameDialog />
              <BadgesDialog mintableBadgeCount={visibleBadges.length} />
              <ReferDialog />
              <UpgradeDialog badges={visibleBadges} />
              <BadgeDetailDialog />
            </>
          )}
        </Container>
      )}
      {badgeAnimationVisible && <FirstBadgeMask badgeWidth={badgewidth}></FirstBadgeMask>}
    </>
  )
}

export default Dashboard
