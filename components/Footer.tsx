import { modals } from '@mantine/modals'
import { Group, Box, Button, Title, List } from '@mantine/core'

export default function Footer() {
  const openDisclaimerModal = () => {
    modals.open({
      id: 'disclaimer',
      size: 'md',
      title: <Title order={4}>DISCLAIMER</Title>,
      children: (
        <Box pr={16}>
          <List fz={14} type="ordered" spacing={20} mb={32}>
            <List.Item>
              THE CONTENT PROVIDED ON THIS WEBSITE IS FOR INFORMATIONAL PURPOSES ONLY AND DOES NOT CONSTITUTE
              PROFESSIONAL ADVICE.
            </List.Item>
            <List.Item>
              WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR RELIABILITY OF THE INFORMATION PRESENTED.
            </List.Item>
            <List.Item>
              THE USE OF ANY MATERIAL ON THIS SITE IS AT YOUR OWN RISK, AND WE ARE NOT LIABLE FOR ANY DAMAGES OR LOSSES.
            </List.Item>
            <List.Item>
              EXTERNAL LINKS ARE PROVIDED FOR CONVENIENCE, AND WE DO NOT ENDORSE OR TAKE RESPONSIBILITY FOR THE CONTENT
              OF LINKED SITES.
            </List.Item>
          </List>
          <Box ta="center">
            <Button onClick={() => modals.closeAll()}>I Agree</Button>
          </Box>
        </Box>
      ),
    })
  }

  return (
    <Group px={16} py={4} justify="center">
      <Button onClick={openDisclaimerModal} fz={14} size="sm" variant="transparent">
        DISCLAIMER
      </Button>
    </Group>
  )
}
