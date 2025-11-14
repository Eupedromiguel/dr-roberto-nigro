import { useState, useEffect } from "react";

function CardCarousel({ cards }) {
  const [current, setCurrent] = useState(0);

  // autoplay
  useEffect(() => {
    const t = setInterval(() => {
      setCurrent((prev) => (prev + 1) % cards.length);
    }, 7000);
    return () => clearInterval(t);
  }, [cards.length]);

  return (
    <div className="w-full overflow-hidden py-0 pb-1 pt-3">
      {/* Slides */}
      <div
        className="flex transition-transform duration-700"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {cards.map((card, i) => (
          <div key={i} className="min-w-full px-0">
            <div
              className="max-w-5xl mx-auto flex flex-col md:flex-row gap-4 items-start text-left
                bg-gray-100 rounded-3xl shadow-xl p-3 border-color-white"
            >
              {/* IMAGEM */}
              <div className="overflow-hidden rounded-2xl border-color-white shadow w-full md:w-[310px] h-[520px]">
                <img
                  src={card.img}
                  alt={card.nome}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* TEXTO */}
              <div className="flex-1 space-y-4">
                <h3 className="text-3xl font-semibold text-gray-800">
                  {card.nome}
                </h3>

                <p className="text-yellow-500 font-medium">
                  {card.subtitulo}
                </p>

                <p className="text-gray-700 leading-relaxed">
                  {card.descricao}
                </p>

                <p className="text-gray-700 whitespace-pre-line">
                  <b>Experiência em:</b>
                  {"\n"}
                  {card.experiencia}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicadores */}
      <div className="flex justify-center gap-3 mt-6 mb-0">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-3 h-3 rounded-full transition-all ${
              current === i ? "bg-yellow-400 scale-125" : "bg-gray-400"
            }`}
          ></button>
        ))}
      </div>
    </div>
  );
}

export default CardCarousel;
