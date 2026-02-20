import SidebarLeft from '../components/sidebar/SidebarLeft';
import CenterPanel from '../components/chart/CenterPanel';
import SidebarRight from '../components/sidebar/SidebarRight';

export default function Dashboard() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: '220px 1fr 280px',
        gridTemplateRows: '1fr',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      <SidebarLeft />
      <CenterPanel />
      <SidebarRight />
    </div>
  );
}
