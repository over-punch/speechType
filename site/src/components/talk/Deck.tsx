'use client'
import { Deck } from './engine'
import { SLIDES, TALK_TITLE, TALK_CSS } from './slides'
export default function TalkDeck() {
	return <Deck slides={SLIDES} title={TALK_TITLE} css={TALK_CSS} autoBuildMs={1300} />
}
