import queensQ from '../assets/queens-q.png'

interface LogoProps {
  size?: 'md' | 'lg'
}

export function Logo({ size = 'md' }: LogoProps) {
  const imageSize = size === 'lg' ? 'h-9' : 'h-8'
  const textSize = size === 'lg' ? 'text-[22px]' : 'text-xl'

  return (
    <div className="flex items-center gap-2.5">
      <img src={queensQ} alt="Q" className={`${imageSize} w-auto`} />
      <span className={`${textSize} font-bold tracking-tight text-on-sidebar`}>Budget</span>
    </div>
  )
}
