import { useAppSelector } from 'store'
import Item from './Item'

export default function SvgItem() {
  const charUrl = useAppSelector((state) => state.editor.charUrl)

  return <Item fId="f" imgUrl={charUrl} ptnUrl="" />
}
