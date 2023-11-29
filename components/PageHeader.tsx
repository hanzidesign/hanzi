'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Group, Text, ActionIcon, Tooltip } from '@mantine/core'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { getEtherscanUrl } from '@/utils/helper'
import { publicEnv } from '@/utils/env'
import { SiOpensea } from 'react-icons/si'
import EtherscanIcon from '@/assets/etherscanIcon'

const opensea = process.env.NEXT_PUBLIC_OPENSEA_URL
const contract = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS

export default function PageHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const atHome = pathname === '/'

  const etherscanUrl = getEtherscanUrl(publicEnv.chainId)
  const etherscan = `${etherscanUrl}/address/${contract}`

  return (
    <Group gap="xs" justify="space-between">
      <Group className="c-pointer" gap={8} onClick={() => router.push(atHome ? '/mint' : '/')}>
        <img src="/icon.svg" alt="" style={{ width: 40, height: 40 }} />
        <Text fz={20} fw="bold">
          Hanzi Design
        </Text>
      </Group>

      {atHome ? (
        <Group gap={24}>
          <Tooltip label="Etherscan">
            <ActionIcon color="dark" radius="xl" variant="transparent" onClick={() => window.open(etherscan, '_blank')}>
              <EtherscanIcon size={32} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Opensea">
            <ActionIcon color="dark" radius="xl" variant="transparent" onClick={() => window.open(opensea, '_blank')}>
              <SiOpensea size={32} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ) : (
        <ConnectButton />
      )}
    </Group>
  )
}
