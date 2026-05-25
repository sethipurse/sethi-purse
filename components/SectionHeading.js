export default function SectionHeading({ title, subtitle, align = 'center', light = false }) {
  return (
    <div className={`mb-10 md:mb-12 ${align === 'center' ? 'text-center' : 'text-left'}`}>
      <h2 className={`heading-section ${light ? 'text-white' : 'text-sethi-black'}`}>{title}</h2>
      <span className={`gold-rule mt-4 ${align === 'center' ? 'mx-auto' : ''}`} />
      {subtitle ? (
        <p className={`mt-4 text-[15px] ${light ? 'text-white/70' : 'text-sethi-gray500'}`}>{subtitle}</p>
      ) : null}
    </div>
  );
}
