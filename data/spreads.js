// プリセットスプレッド定義。
// positions の x,y は spread-canvas 内の % 座標（カード中心の位置）。
// aspect は canvas の横:縦比（CSSの aspect-ratio にそのまま渡す）。
// rotate は任意（度数、レイアウト上の回転。逆位置の回転とは別物）。
const SPREADS = [
  {
    id: "one-oracle",
    name: "ワンオラクル",
    aspect: "1 / 1.4",
    positions: [
      { id: "p1", label: "今日のカード", x: 50, y: 50 },
    ],
  },
  {
    id: "yes-no",
    name: "Yes / No",
    aspect: "1 / 1.4",
    positions: [
      { id: "p1", label: "Yes / No", x: 50, y: 50 },
    ],
  },
  {
    id: "three-card",
    name: "スリーカード（過去・現在・未来）",
    aspect: "3 / 1.5",
    positions: [
      { id: "p1", label: "過去", x: 18, y: 50 },
      { id: "p2", label: "現在", x: 50, y: 50 },
      { id: "p3", label: "未来", x: 82, y: 50 },
    ],
  },
  {
    id: "horseshoe",
    name: "ホースシュー（馬蹄形）",
    aspect: "3 / 1.7",
    // 頂点(本人の姿勢)がキャンバス上端に近く、ラベルをカード上に置くと画面によっては見切れるため、
    // このスプレッドだけラベルをカードの下に表示する
    labelPosition: "below",
    positions: [
      { id: "p1", label: "過去", x: 6, y: 60 },
      { id: "p2", label: "現在", x: 20, y: 38 },
      { id: "p3", label: "近い未来", x: 34, y: 20 },
      { id: "p4", label: "本人の姿勢", x: 50, y: 12 },
      { id: "p5", label: "周囲の影響", x: 66, y: 20 },
      { id: "p6", label: "壁・課題", x: 80, y: 38 },
      { id: "p7", label: "結果", x: 94, y: 60 },
    ],
  },
  {
    id: "hexagram",
    name: "ヘキサグラム（六芒星）",
    aspect: "1 / 1.15",
    positions: [
      { id: "p1", label: "過去", x: 50, y: 15 },
      { id: "p2", label: "現在", x: 80, y: 33 },
      { id: "p3", label: "未来", x: 80, y: 68 },
      { id: "p4", label: "課題の原因", x: 50, y: 85 },
      { id: "p5", label: "周囲の状況", x: 20, y: 68 },
      { id: "p6", label: "対策・アドバイス", x: 20, y: 33 },
      { id: "p7", label: "最終的な結果", x: 50, y: 50 },
    ],
  },
  {
    id: "celtic-cross",
    name: "ケルト十字",
    aspect: "1 / 1.15",
    // p1とp2はケルト十字の伝統的な意匠として重ねて表示する(衝突判定の対象から除外)
    overlapAllowed: [["p1", "p2"]],
    positions: [
      { id: "p1", label: "現在の状況", x: 26, y: 47 },
      { id: "p2", label: "障害・課題", x: 34, y: 53, rotate: 90 },
      { id: "p3", label: "目標・意識", x: 30, y: 20 },
      { id: "p4", label: "基盤・原因", x: 30, y: 80 },
      { id: "p5", label: "過去", x: 10, y: 50 },
      { id: "p6", label: "未来", x: 50, y: 50 },
      { id: "p7", label: "自分自身", x: 78, y: 85 },
      { id: "p8", label: "周囲の影響", x: 78, y: 63 },
      { id: "p9", label: "望み・恐れ", x: 78, y: 41 },
      { id: "p10", label: "最終結果", x: 78, y: 19 },
    ],
  },
];
