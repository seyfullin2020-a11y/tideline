import { GameScreen } from '../../../components/game-screen';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <GameScreen id={(await params).id} />;
}
