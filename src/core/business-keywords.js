// 业态关键词按“更具体的短语优先”排列，避免「猫咖」先被「咖」截获、
// 「药水」先被「药」截获。
const BUSINESS_KEYWORD_RULES = [
  ['catCafe', /猫咖|猫/i],
  ['potion', /药水|魔法|potion/i],
  ['burger', /汉堡|堡|burger/i],
  ['ramen', /拉面|ramen/i],
  ['coffee', /咖啡|coffee|咖/i],
  ['bubbletea', /奶茶|boba|珍珠/i],
  ['bookstore', /书|book/i],
  ['flower', /花|flor/i],
  ['barber', /理发|剪|barber|发/i],
  ['grocery', /杂货|超市|market/i],
  ['pharmacy', /药|pharm/i],
  ['cyberRepair', /修|repair|fix/i],
  ['vintage', /古着|vintage|古/i],
  ['toyshop', /玩具|toy/i],
  ['record', /唱片|音乐|record/i],
  ['watchmaker', /钟|表|watch/i],
  ['photo', /照|相|photo/i],
  ['fortune', /占卜|塔罗|fortune/i],
  ['weapon', /武器|锻造|weapon|剑/i],
  ['noodle', /面|noodle/i],
]

export function matchBusinessKeyword(name) {
  for (const [id, pattern] of BUSINESS_KEYWORD_RULES) {
    if (pattern.test(name)) return id
  }
  return null
}

export { BUSINESS_KEYWORD_RULES }
