import { auth } from "@/auth";
import { SignInButton } from "@/components/auth-buttons";
import { Dashboard } from "@/components/dashboard";
import { getOrCreateCharacter } from "@/lib/game/character";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-3 text-4xl font-bold text-jade sm:text-5xl">
          Tu Tiên Nhàn Rỗi
        </h1>
        <p className="mb-8 max-w-md text-white/60">
          Bế quan luyện khí, đột phá cảnh giới, vượt ải trảm yêu. Một tựa game
          idle tu tiên — tu vi tăng theo thời gian, dù bạn có online hay không.
        </p>
        <SignInButton />
        <p className="mt-6 text-xs text-white/30">
          Đăng nhập bằng Google để bắt đầu con đường tu tiên của bạn.
        </p>
      </main>
    );
  }

  const character = await getOrCreateCharacter(session.user.id);

  return <Dashboard character={character} userName={session.user.name} />;
}
