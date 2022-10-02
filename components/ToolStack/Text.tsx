import { Grid, Box, Title } from '@mantine/core'

export default function Text() {
  return (
    <Box
      sx={(theme) => ({
        padding: 20,
        backgroundColor: theme.colors.gray[0],
      })}
    >
      <Grid>
        <Grid.Col span={6}>
          <Title order={4}>Country</Title>
        </Grid.Col>
        <Grid.Col span={6}>
          <Title order={4}>Year</Title>
        </Grid.Col>
        <Grid.Col span={6}>3</Grid.Col>
        <Grid.Col span={6}>4</Grid.Col>
      </Grid>
    </Box>
  )
}
