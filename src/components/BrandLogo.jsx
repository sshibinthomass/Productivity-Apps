const brandBase = `${import.meta.env.BASE_URL}brand/`

export default function BrandLogo({
  variant = 'lockup',
  className = '',
}) {
  const classes = ['brand-logo', `brand-logo--${variant}`, className]
    .filter(Boolean)
    .join(' ')

  if (variant === 'symbol') {
    return (
      <img
        alt="Arvenilo Network"
        className={classes}
        src={`${brandBase}arvenilo-network-symbol.png`}
      />
    )
  }

  return (
    <picture className="brand-logo-picture">
      <source
        media="(max-width: 520px)"
        srcSet={`${brandBase}arvenilo-network-symbol.png`}
      />
      <img
        alt="Arvenilo Network"
        className={classes}
        src={`${brandBase}arvenilo-network-lockup.png`}
      />
    </picture>
  )
}
