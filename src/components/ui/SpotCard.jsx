import { useSpotlight } from '../../lib/hooks';

/** Glass card with cursor-following spotlight. Renders `as` (default div). */
export default function SpotCard({ as: Tag = 'div', className = '', children, spot = '', ...rest }) {
  const sp = useSpotlight();
  return (
    <Tag className={`glass spot ${className}`} {...sp} {...rest} style={{ ...(spot ? { '--spot-color': spot } : null), ...(rest.style || null) }}>
      {children}
    </Tag>
  );
}
