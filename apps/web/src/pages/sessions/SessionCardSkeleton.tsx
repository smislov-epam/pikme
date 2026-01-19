import { Card, CardContent, Skeleton, Stack } from '@mui/material'

export function SessionCardSkeleton() {
  return (
    <Card elevation={1} sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="rounded" width={60} height={24} />
          </Stack>
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="rounded" width={140} height={24} />
        </Stack>
      </CardContent>
    </Card>
  )
}
