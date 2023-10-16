import { useRouter } from 'next/router'
import { Group, Text, ActionIcon, Tooltip } from '@mantine/core'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import useChain from 'hooks/useChain'
import { SiOpensea } from 'react-icons/si'
import EtherscanIcon from 'assets/etherscanIcon'

const opensea = process.env.NEXT_PUBLIC_OPENSEA_URL
const contract = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS

type PageHeaderProps = {
  showButton?: boolean
  labelUrl?: string
}

export default function PageHeader(props: PageHeaderProps) {
  const { showButton, labelUrl = '/' } = props
  const router = useRouter()
  const { etherscanUrl } = useChain()
  const etherscan = `${etherscanUrl}/address/${contract}`

  return (
    <Group gap="xs" h={40} justify="space-between">
      <Group className="c-pointer" gap={8} onClick={() => router.push(labelUrl)}>
        <img src="/icon.svg" alt="" style={{ width: 40, height: 40 }} />
        <Text fz={20} fw="bold">
          Hanzi Design
        </Text>
      </Group>

      {showButton ? (
        <ConnectButton />
      ) : (
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
      )}
    </Group>
  )
}
