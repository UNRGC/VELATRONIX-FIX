const LOGO_SRC = "/brand/logo.png";

export function Logo({ height = 32 }: { height?: number }) {
    return <img src={LOGO_SRC} alt="Velatronix" height={height} style={{ display: "block", height, width: "auto", flexShrink: 0 }} />;
}

export function Brand({ sub, logoSize = 32 }: { sub?: string; logoSize?: number }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Logo height={logoSize} />
            {sub && <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--brand-blue)" }}>{sub}</div>}
        </div>
    );
}
