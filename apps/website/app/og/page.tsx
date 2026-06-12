import Dither from '@/components/effects/dither'

export default function OGPage() {
  return (
    <div
      className="relative flex flex-col justify-between bg-taupe-950 overflow-hidden"
      style={{ width: 1200, height: 630 }}
    >
      {/* Dither background */}
      <div className="absolute inset-0" style={{ opacity: 0.1 }}>
        <Dither
          waveColor={[0.9, 0.9, 0.9]}
          disableAnimation
          enableMouseInteraction={false}
          mouseRadius={0.1}
          colorNum={3}
          pixelSize={6}
          waveAmplitude={0}
          waveFrequency={2.5}
          waveSpeed={0.03}
        />
      </div>

      {/* Content */}
      <div className="relative flex flex-col justify-between h-full p-16">
        {/* Logo */}
        <svg
          aria-hidden
          fill="none"
          viewBox="0 0 741 276"
          xmlns="http://www.w3.org/2000/svg"
          className="h-[30px] w-auto self-start text-taupe-50"
        >
          <path
            clipRule="evenodd"
            d="M361.654 1.23954L145.322 59.4931L27.393 91.2486C16.356 94.2206 7.74231 102.854 4.79539 113.898L0.418428 130.301C-1.96349 139.227 6.21201 147.384 15.1329 144.982L117.256 117.482C125.771 115.189 133.769 122.557 132.18 131.232L119.201 202.08C114.64 225.367 136.157 245.283 158.877 238.803L374.011 177.441L455.882 155.395C464.459 153.086 472.486 160.572 470.778 169.289L457.313 238.037C452.752 261.324 474.27 281.241 496.989 274.76L681.03 222.267C700.109 216.826 714.536 201.084 718.366 181.528L739.442 73.9199C744.003 50.633 722.486 30.7167 699.766 37.1969L484.632 98.5586L402.761 120.605C394.184 122.914 386.157 115.428 387.865 106.711L401.33 37.9626C405.891 14.6756 384.373 -5.24058 361.654 1.23954Z"
            fill="currentColor"
            fillRule="evenodd"
          />
        </svg>

        {/* Headline */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col">
            <span className="text-[86px]/[1.05] font-medium tracking-[-0.03em] text-taupe-50">
              React Native
            </span>
            <span className="text-[86px]/[1.05] font-redaction italic tracking-[-0.02em] text-taupe-50">
              Motion
            </span>
          </div>
          <span className="text-[22px] font-medium text-taupe-400">
            Beautiful animations for React Native and Expo.
          </span>
        </div>
      </div>
    </div>
  )
}
