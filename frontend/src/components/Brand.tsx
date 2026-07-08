const LOGO_SRC = "/brand/logo.png";
// Proporción real del archivo (5858×1124). Fijarla evita que el logo se aplane
// si un contenedor angosto intenta estirarlo a lo ancho.
const LOGO_RATIO = 5858 / 1124;

export function Logo({ height = 32 }: { height?: number }) {
    return (
        <img
            src={LOGO_SRC}
            alt="Velatronix"
            width={Math.round(height * LOGO_RATIO)}
            height={height}
            style={{
                display: "block",
                height,
                width: "auto",
                maxWidth: "100%",
                aspectRatio: `${LOGO_RATIO}`,
                objectFit: "contain",
                flexShrink: 0,
            }}
        />
    );
}

export function Brand({ sub, logoSize = 48 }: { sub?: string; logoSize?: number }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Logo height={logoSize} />
            {sub && <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--brand-blue)" }}>{sub}</div>}
        </div>
    );
}
