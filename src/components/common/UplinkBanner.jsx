import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { subscribeUplink, getUplinkStatus } from '../../data/dataStore';
import './UplinkBanner.css';

/** Appears when API requests start failing at the network level. */
export default function UplinkBanner() {
  const [online, setOnline] = useState(getUplinkStatus());
  useEffect(() => subscribeUplink(setOnline), []);
  if (online) return null;
  return (
    <div className="uplink-banner glass" role="status" aria-live="polite">
      <WifiOff size={15} />
      <span>Uplink lost — data may be out of date.</span>
      <button onClick={() => window.location.reload()}>Reconnect</button>
    </div>
  );
}
