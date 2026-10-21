import "../styles/dashboard.css";

const cardText = [
    { id: "active", title: "Active Content"},
    { id: "scheduled", title: "Scheduled Content"},
    { id: "expired", title: "Expired Content"},
    { id: "displays", title: "Registered Displays"}
]

function StatCard({ title, value, status}) {
    const hasData = value !== undefined && value !== null;

    return (
        <div className='stat-cards' style={{ border: "1px solid #000", padding: "18px 16px", minHeight: "110px", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "bold", letterSpacing: "1px" }}>
                <span>{title.toUpperCase()}</span>
                { status && <span className="status-tag">[ {status} ]</span> }
            </div>
                <div className={hasData ? "cardValue" : "cardValue empty"}>
                    {hasData ? value : "0" }
                </div>
        </div>
    )
}

function Panel ({ title, children }) {
    return (
        <section className="panel" style={{ border: "1px solid #000", padding: "16px", minHeight: "200px", display: "flex", flexDirection: "column", background: "#fff" }}>
            <h3 className="panel-title" style={{ margin: "0 0 16px 0", paddingBottom: "8px", borderBottom: "1px solid #000", fontSize: "18px", fontWeight: "bold" }}>
                {title}
            </h3>
            {children}
        </section>
    )
}

function RecentContent () {
    return (
        <Panel title="Recent Content">
        </Panel>
    )
}

function DisplaysPanel() {
  return (
    <Panel title="DISPLAYS">
    </Panel>
  );
}

function Dashboard() {
  return <DashboardHome />;
}

export default Dashboard

export function DashboardHome() {
    const contentData = {};

    return (
        <>
            <div className="main-label">
                <p className="main-text">Administrator Dashboard</p>
                <h1>Dashboard</h1>
            </div>

            <div className="stat-cards stats-grid">
                {cardText.map((card) => (
                    <StatCard
                        key={card.id}
                        title={card.title}
                        value={contentData[card.id]?.value}
                        status={contentData[card.id]?.status}
                    />
                ))}
            </div>

            <div className="panels">
                <RecentContent />
                <DisplaysPanel />
            </div>
        </>
    );
}
