import SepaChecklist from '../analysis/SepaChecklist';
import TradePlan from '../analysis/TradePlan';
import AlertsFeed from '../analysis/AlertsFeed';

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />;
}

export default function SidebarRight() {
  return (
    <aside
      style={{
        width: 280,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <SepaChecklist />
        <Divider />
        <TradePlan />
        <Divider />
        <AlertsFeed />
      </div>
    </aside>
  );
}
