import type { Metadata } from "next";
import { Fraunces, Inter_Tight, JetBrains_Mono, Onest } from "next/font/google";
import "./globals.css";

const onest = Onest({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-onest",
	display: "swap",
});

const fraunces = Fraunces({
	subsets: ["latin"],
	style: ["normal", "italic"],
	variable: "--font-fraunces",
	display: "swap",
});

const interTight = Inter_Tight({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
	variable: "--font-inter-tight",
	display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-mono",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Relay - Local-first AI for the practice of law",
	description: "Local-first AI for the practice of law",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${onest.variable} ${interTight.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}
		>
			<body>{children}</body>
		</html>
	);
}
