import "react";

/* Allow CSS custom properties in style props: style={{ "--i": 2 }} */
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
