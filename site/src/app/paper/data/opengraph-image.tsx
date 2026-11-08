import { talkOgImage, TALK_OG_SIZE } from '../../../components/talk/talkOg'
export const size = TALK_OG_SIZE
export const contentType = 'image/png'
export const alt = 'Keep the Text: Measuring What Split-Text Effects Cost — Data & methods'
export default async function Image() {
 return talkOgImage({ tool: 'speechType', eyebrow: 'Data & methods · browser experiment', title: ['Keep the Text', 'What split-text effects cost'], footnote: 'Shaping · semantics · keyboard stops', path: 'speechtype.vercel.app/paper/data' })
}
