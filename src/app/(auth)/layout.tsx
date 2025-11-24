import { Think } from "ui/think";
import ShaderBackground from "@/components/ui/shader-background";
import AuthHeroContent from "@/components/auth/auth-hero-content";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  const t = await getTranslations("Auth.Intro")
  return (
    <main className="relative w-full flex flex-col h-screen">
      <div className="flex-1">
        <div className="flex min-h-screen w-full">
          <div className="hidden lg:flex lg:w-1/2 border-r relative overflow-hidden">
            <ShaderBackground>
              <div className="relative z-10 flex flex-col h-full p-18">
                <h1 className="text-xl font-semibold flex items-center gap-3 animate-in fade-in duration-1000 text-white">
                  <Think />
                  <span>ResAI</span>
                </h1>
                <div className="flex-1" />
                <AuthHeroContent
                  description={t("description")}
                />
              </div>
            </ShaderBackground>
          </div>

          <div className="w-full lg:w-1/2 p-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
