import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ButtonLink } from "@/components/elements/button";
import { Navbar, NavbarLogo } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { LogoMark } from "@/components/elements/logo-mark";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://reactnativemotion.dev"),
  title: "React Native Motion",
  description: "Beautiful animations for React Native and Expo.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicons/favicon.ico",
    apple: "/favicons/apple-touch-icon.png",
  },
  manifest: "/favicons/site.webmanifest",
  openGraph: {
    title: "React Native Motion",
    description: "Beautiful animations for React Native and Expo.",
    images: [{ url: "/og-image.png", width: 2400, height: 1260 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "React Native Motion",
    description: "Beautiful animations for React Native and Expo.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar
          logo={
            <NavbarLogo className="group" href="/">
              <span className="sr-only">React Native Motion</span>
              <LogoMark className="h-4 w-auto shrink-0 text-taupe-800 group-hover:text-taupe-900 dark:text-taupe-300 dark:group-hover:text-taupe-200" />
            </NavbarLogo>
          }
          actions={
            <>
              <a href="https://github.com/SchroederNathan/react-native-motion" className="inline-flex items-center py-1 text-taupe-800 hover:text-taupe-900 dark:text-taupe-300 dark:hover:text-taupe-200 max-sm:hidden" aria-label="GitHub">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-7">
                  <path d="M14.0588 22.561V17.844C14.0588 17.4767 13.9506 17.1574 13.7762 16.8689C13.6566 16.6711 13.7385 16.3903 13.9547 16.3283C15.7447 15.8147 17 14.9888 17 12.2493C17 11.5371 16.7764 10.8675 16.3834 10.2847C16.3755 10.2729 16.368 10.2617 16.3607 10.251C16.2785 10.1294 16.2372 10.0684 16.2251 10.0021C16.213 9.93551 16.2302 9.86352 16.2649 9.71917C16.268 9.70625 16.2712 9.69276 16.2746 9.67864C16.4183 9.07572 16.4298 8.44056 16.2692 7.84807C16.2164 7.65332 16.1032 7.53972 15.8983 7.56165C15.6326 7.5901 15.1725 7.71727 14.49 8.16229C14.2219 8.33714 14.0878 8.42456 13.9697 8.44412C13.8516 8.46367 13.6938 8.42271 13.378 8.34078C12.9463 8.22875 12.5014 8.16861 12 8.16861C11.4986 8.16861 11.0537 8.22875 10.622 8.34079C10.3062 8.42271 10.1484 8.46367 10.0303 8.44412C9.91221 8.42456 9.77813 8.33713 9.50999 8.16228C8.82753 7.71726 8.3674 7.5901 8.10166 7.56165C7.8968 7.53972 7.78361 7.65332 7.73081 7.84807C7.57017 8.44057 7.58167 9.07574 7.72543 9.67865C7.7288 9.69277 7.73203 9.70627 7.73513 9.71919C7.76976 9.86353 7.78702 9.93551 7.77487 10.0021C7.76277 10.0684 7.72154 10.1294 7.63929 10.251C7.63203 10.2618 7.62444 10.273 7.61654 10.2847C7.22356 10.8675 7 11.5371 7 12.2493C7 14.9888 8.25526 15.8147 10.0453 16.3283C10.2615 16.3903 10.3434 16.6711 10.2238 16.8689C10.0494 17.1574 9.94118 17.4767 9.94118 17.844V18.2942C9.90763 18.2899 9.87365 18.2851 9.84326 18.28C9.65732 18.2487 9.39055 18.1892 9.08352 18.0777C8.46975 17.8549 7.71089 17.431 7.09869 16.6198C6.84917 16.2892 6.37887 16.2234 6.04825 16.4729C5.71762 16.7224 5.65187 17.1927 5.90139 17.5234C6.7299 18.6212 7.75836 19.1925 8.57172 19.4877C8.97826 19.6353 9.33501 19.7155 9.5942 19.7591C9.72411 19.781 9.83045 19.7939 9.90744 19.8014C9.91685 19.8023 9.92854 19.8033 9.94118 19.8042V22.5556C5.04611 21.6191 1.25391 17.3958 1.25391 12C1.25391 5.67848 6.15183 1.25 12.0001 1.25C17.8485 1.25 22.7464 5.36535 22.7464 12.0039C22.7464 17.521 18.954 21.6492 14.0588 22.561Z" />
                </svg>
              </a>
              <ButtonLink href="https://ko-fi.com/nathanschroeder">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                  <path d="M19.75 15V13C19.75 12.4477 19.3023 12 18.75 12H16.75C16.1977 12 15.75 11.5523 15.75 11C15.75 10.4477 16.1977 10 16.75 10H18.75C20.4069 10 21.75 11.3431 21.75 13V15C21.75 16.6569 20.4069 18 18.75 18H16.75C16.1977 18 15.75 17.5523 15.75 17C15.75 16.4477 16.1977 16 16.75 16H18.75C19.3023 16 19.75 15.5523 19.75 15Z" />
                  <path d="M5 5.25V3.25C5 2.69772 5.44772 2.25 6 2.25C6.55228 2.25 7 2.69772 7 3.25V5.25C7 5.80228 6.55228 6.25 6 6.25C5.44772 6.25 5 5.80228 5 5.25ZM9 5.25V3.25C9 2.69772 9.44772 2.25 10 2.25C10.5523 2.25 11 2.69772 11 3.25V5.25C11 5.80228 10.5523 6.25 10 6.25C9.44772 6.25 9 5.80228 9 5.25ZM13 5.25V3.25C13 2.69772 13.4477 2.25 14 2.25C14.5523 2.25 15 2.69772 15 3.25V5.25C15 5.80228 14.5523 6.25 14 6.25C13.4477 6.25 13 5.80228 13 5.25Z" />
                  <path d="M14 21.75C16.0711 21.75 17.75 20.0711 17.75 18V10C17.75 9.0335 16.9665 8.25 16 8.25H4C3.0335 8.25 2.25 9.0335 2.25 10V18C2.25 20.0711 3.92893 21.75 6 21.75H14Z" />
                </svg>
                Buy me a coffee
              </ButtonLink>
            </>
          }
        />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
