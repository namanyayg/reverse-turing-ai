import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Roast My HackerNews'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image({ params }: { params: { username: string } }) {
  const userData = await fetch(`https://hacker-news.firebaseio.com/v0/user/${params.username}.json`).then((res) =>
    res.json()
  )

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          padding: 20,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 30, opacity: 0.7 }}>THE ROAST OF</div>
          <div style={{ display: 'flex', fontWeight: 'bold' }}>{userData.id}</div>
          <div style={{ display: 'flex', fontSize: 30, marginTop: 20 }}>Karma: {userData.karma}</div>
          <div style={{ display: 'flex', fontSize: 20, marginTop: 40, opacity: 0.7 }}>Roasted using https://roastmyhn.nmn.gl/</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}