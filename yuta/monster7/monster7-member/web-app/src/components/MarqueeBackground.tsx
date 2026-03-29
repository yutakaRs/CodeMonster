import { useState, useEffect, useCallback } from "react";

const BASE = "https://images.unsplash.com/";
const PARAMS = "?w=400&h=300&fit=crop&auto=format&q=75";

const allImages = [
  `${BASE}photo-1677442136019-21780ecad995${PARAMS}`,
  `${BASE}photo-1485827404703-89b55fcc595e${PARAMS}`,
  `${BASE}photo-1518770660439-4636190af475${PARAMS}`,
  `${BASE}photo-1620712943543-bcc4688e7485${PARAMS}`,
  `${BASE}photo-1555949963-ff9fe0c870eb${PARAMS}`,
  `${BASE}photo-1635070041078-e363dbe005cb${PARAMS}`,
  `${BASE}photo-1507146153580-69a1fe6d8aa1${PARAMS}`,
  `${BASE}photo-1676299081847-824916de030a${PARAMS}`,
  `${BASE}photo-1526374965328-7f61d4dc18c5${PARAMS}`,
  `${BASE}photo-1451187580459-43490279c0fa${PARAMS}`,
  `${BASE}photo-1558494949-ef010cbdcc31${PARAMS}`,
  `${BASE}photo-1550751827-4bd374c3f58b${PARAMS}`,
  `${BASE}photo-1680474569854-81216b34417a${PARAMS}`,
  `${BASE}photo-1697577418970-95d99b5a55cf${PARAMS}`,
  `${BASE}photo-1488229297570-58520851e868${PARAMS}`,
  `${BASE}photo-1639322537228-f710d846310a${PARAMS}`,
  `${BASE}photo-1544197150-b99a580bb7a8${PARAMS}`,
  `${BASE}photo-1515378960530-7c0da6231fb1${PARAMS}`,
  `${BASE}photo-1712002641088-9d76f9080889${PARAMS}`,
  `${BASE}photo-1696258686454-60082b2c33e2${PARAMS}`,
  `${BASE}photo-1684369175833-4b445ad6bfb5${PARAMS}`,
  `${BASE}photo-1625314887424-9f190599bd56${PARAMS}`,
  `${BASE}photo-1593508512255-86ab42a8e620${PARAMS}`,
  `${BASE}photo-1679083216051-aa510a1a2c0e${PARAMS}`,
  `${BASE}photo-1639322537504-6427a16b0a28${PARAMS}`,
  `${BASE}photo-1581091226825-a6a2a5aee158${PARAMS}`,
  `${BASE}photo-1509228468518-180dd4864904${PARAMS}`,
  `${BASE}photo-1516110833967-0b5716ca1387${PARAMS}`,
  `${BASE}photo-1580584126903-c17d41830450${PARAMS}`,
  `${BASE}photo-1504639725590-34d0984388bd${PARAMS}`,
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function MarqueeRow({
  images,
  direction,
  speed,
}: {
  images: string[];
  direction: "left" | "right";
  speed: number;
}) {
  // Duplicate for seamless infinite scroll
  const items = [...images, ...images];

  return (
    <div className="marquee-row overflow-hidden">
      <div
        className={direction === "left" ? "marquee-track-left" : "marquee-track-right"}
        style={{ animationDuration: `${speed}s` }}
      >
        {items.map((src, i) => (
          <div key={i} className="marquee-card">
            <img
              src={src}
              alt=""
              loading="lazy"
              draggable={false}
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MarqueeBackground() {
  const buildRows = useCallback(() => {
    const shuffled = shuffle(allImages);
    // 5 rows of 6 unique images each
    return [
      shuffled.slice(0, 6),
      shuffled.slice(6, 12),
      shuffled.slice(12, 18),
      shuffled.slice(18, 24),
      shuffled.slice(24, 30),
    ];
  }, []);

  const [rows, setRows] = useState(buildRows);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setRows(buildRows());
        setFading(false);
      }, 800);
    }, 10000);
    return () => clearInterval(interval);
  }, [buildRows]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className={`marquee-container ${fading ? "marquee-fade-out" : "marquee-fade-in"}`}
      >
        <MarqueeRow images={rows[0]} direction="left" speed={25} />
        <MarqueeRow images={rows[1]} direction="right" speed={30} />
        <MarqueeRow images={rows[2]} direction="left" speed={20} />
        <MarqueeRow images={rows[3]} direction="right" speed={35} />
        <MarqueeRow images={rows[4]} direction="left" speed={28} />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#09090b]/60" />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, #09090b 75%)",
        }}
      />
    </div>
  );
}
