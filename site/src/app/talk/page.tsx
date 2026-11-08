import TalkDeck from '../../components/talk/Deck'
import { talkMetadata } from '../../content/talkMeta'
export const metadata = talkMetadata('/talk', 'talk')
export default function TalkPage() { return <TalkDeck /> }
