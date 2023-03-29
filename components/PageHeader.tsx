import { useRouter } from 'next/router'
import { Group, Header, Text, ActionIcon, Tooltip } from '@mantine/core'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { HeaderProps } from '@mantine/core'
import useChain from 'hooks/useChain'
import { SiOpensea } from 'react-icons/si'
import EtherscanIcon from 'assets/etherscanIcon'

const opensea = process.env.NEXT_PUBLIC_OPENSEA_URL
const contract = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS

type PageHeaderProps = {
  showButton?: boolean
  labelUrl?: string
  headerProps?: Omit<HeaderProps, 'height' | 'children'>
}

export default function PageHeader(props: PageHeaderProps) {
  const { showButton, headerProps, labelUrl = '/' } = props
  const router = useRouter()
  const { etherscanUrl } = useChain()
  const etherscan = `${etherscanUrl}/address/${contract}`

  return (
    <Header height={{ base: 72 }} p={16} px={{ sm: 40 }} {...headerProps}>
      <Group position="apart" spacing="xs" h={40}>
        <Group className="c-pointer" spacing={8} onClick={() => router.push(labelUrl)}>
          <img src="/icon.svg" alt="" style={{ width: 40, height: 40 }} />
          <Text fz={20} fw="bold">
            Chinese NFT
          </Text>
        </Group>

        {showButton ? (
          <ConnectButton />
        ) : (
          <Group spacing={24}>
            <Tooltip label="Etherscan">
              <ActionIcon
                color="dark"
                radius="xl"
                variant="transparent"
                onClick={() => window.open(etherscan, '_blank')}
              >
                <EtherscanIcon size={32} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Opensea">
              <ActionIcon
                color="dark"
                radius="xl"
                variant="transparent"
                onClick={() => window.open(opensea, '_blank')}
              >
                <SiOpensea size={32} />
              </ActionIcon>
            </Tooltip>
          </Group>
        )}
      </Group>
    </Header>
  )
}
