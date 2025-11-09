import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Stethoscope } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export default function HomeScreen() {
  const { user } = useAuth();

  const SectionDivider = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="w-16 h-[2px] bg-yellow-400 mr-3 rounded-full animate-pulse"></div>
      <Stethoscope className="w-8 h-8 text-yellow-500" strokeWidth={1.5} />
      <div className="w-16 h-[2px] bg-yellow-400 ml-3 rounded-full animate-pulse"></div>
    </div>
  );

  const slides = [
    {
      img: "/FOTOS-IA-1.png",
      title: "Ambiente moderno",
      desc: "Cada detalhe do nosso espaço foi pensado para o seu conforto e bem-estar.",
    },
    {
      img: "/FOTOS-IA-2.png",
      title: "Estrutura completa",
      desc: "Consultórios amplos, climatizados e equipados com tecnologia de ponta.",
    },
    {
      img: "/FOTOS-IA-3.png",
      title: "Cuidado em cada detalhe",
      desc: "Nosso ambiente transmite tranquilidade e segurança para o paciente.",
    },
    {
      img: "/FOTOS-IA-4.png",
      title: "Tecnologia e precisão",
      desc: "Equipamentos de última geração que garantem diagnósticos seguros.",
    },
    {
      img: "/FOTOS-IA-5.png",
      title: "Atendimento humanizado",
      desc: "Nossa equipe está sempre pronta para ouvir, acolher e cuidar.",
    },
  ];

  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
  <div className="min-h-screen flex flex-col text-center text-gray-950 px-4 md:px-0">
    {/* Container arredondado principal */}
    <div className="flex-1 rounded-[3rem] md:rounded-[4rem] shadow-xl overflow-hidden mt-4 md:mt-0">

      {/* HERO */}
      <section className="relative w-full bg-gradient-to-b from-gray-950 to-gray-800 text-white py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/consultorio-hero.jpg"
            alt="Clínica Dr. Roberto Nigro"
            className="w-full h-full object-cover opacity-10"
            loading="lazy"
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-momo mb-4">
            Bem-vindo
          </h1>
          <p className="text-slate-200 max-w-2xl mx-auto text-lg leading-relaxed">
            Cuide da sua saúde com praticidade. Agende consultas, visualize
            médicos e acompanhe seu histórico de atendimento.
          </p>
        </div>
      </section>

      {/* CORPO CLÍNICO */}
      <section className="w-full bg-white text-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <SectionDivider />
          <h2 className="text-4xl font-light mb-10 text-center">
            Conheça nosso corpo clínico
          </h2>

          {/* === CARD 1 === */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-16 text-left">
            <div className="overflow-hidden rounded-2xl border border-gray-300 shadow-lg w-full md:w-[380px] h-[420px]">
              <img
                src="Roberto-IA-1.jpg"
                alt="Dr. Roberto Nigro"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-2xl font-semibold text-gray-900">
                Dr. Roberto Nigro
              </h3>
              <p className="text-yellow-600 font-medium">
                Gastroenterologista | CRM 59834/SP - RQE 24030 - RQE 24029
              </p>
              <p className="text-gray-700 leading-relaxed">
                Médico cirugião do aparelho digestivo com mais de 37 anos de experiência especializado em Coloproctologia, Gastroenterologista, Cirurgia Oncológica de Cólon, Reto e Ânus, Cirurgia da Obesidade Mórbida, Cirurgia Videolaparoscópica e Robótica.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Experiência em:
                <br />
                <br />
                - Cirurgia videolaparoscópica
                <br />
                - Cirurgia da obesidade mórbida
                <br />
                - Oncologia gastrointestinal
                <br />
                - Cirurgia laparoscópica colorretal
                <br />
                - Cirurgia oncológica do cólon, reto e ânus
                <br />
                - Cirurgia coloproctologica
                <br />
                - Cirurgia de vesícula
              </p>
            </div>
          </div>

          {/* === CARD 2 === */}
          <div className="flex flex-col md:flex-row-reverse items-center md:items-start gap-8 mb-16 text-left">
            <div className="overflow-hidden rounded-2xl border border-gray-300 shadow-lg w-full md:w-[380px] h-[420px]">
              <img
                src="Bruna-IA-1.jpg"
                alt="Dra. Bruna Nigro"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-2xl font-semibold text-gray-900">
                Dra. Bruna Nigro
              </h3>
              <p className="text-yellow-600 font-medium">
                Gastroenterologista | CRM: 199354/SP - RQE 109961
              </p>
              <p className="text-gray-700 leading-relaxed">
                Cirurgiã geral e do aparelho digestivo pela Universidade de São Paulo (USP) HCFMUSP.
                Atuo principalmente nas áreas de gastrocirurgia e coloproctologia, resolvendo doenças do trato digestivo como obesidade, refluxo, apendicite, hemorróidas, cálculos de vesícula biliar, cânceres e outras afecções desse extenso e complexo sistema, sejam seus tratamentos cirúrgicos ou não.
                <br />
                <br />
                Experiência em:
                <br />
                <br />
                - Proctologia
                <br />
                - Cirurgia Robótica
                <br />
                - Cirurgia Videolaparoscópica
                <br />
                - Oncologia Gastrointestinal
                <br />
              </p>
            </div>
          </div>

          {/* === CARD 3 === */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 text-left">
            <div className="overflow-hidden rounded-2xl border border-gray-300 shadow-lg w-full md:w-[380px] h-[420px]">
              <img
                src="Danilo-IA-1.jpg"
                alt="Dr. Danilo Nagato"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-2xl font-semibold text-gray-900">
                Dr. Danilo Castro Nagato
              </h3>
              <p className="text-yellow-600 font-medium">
                Urologista | CRM: 210961/SP - RQE 135155
              </p>
              <p className="text-gray-700 leading-relaxed">
                Médico Preceptor da Divisão de Urologia do Hospital das Clínicas da Faculdade de Medicina da USP (HCFMUSP)
                <br />
                Graduação em Medicina - Universidade Federal do Paraná (UFPR)
                <br />
                Residência em Cirurgia Geral e Urologia - Hospital das Clínicas da Faculdade de Medicina da Universidade de São Paulo (HCFMUSP)
                <br />
                Observership Hospital da Luz - Lisboa
                <br />
                <br />
                Experiência em:
                <br />
                <br />
                - Litíase
                <br />
                - Cirurgia robótica
                <br />
                - Cirurgia robótica da próstata
                <br />
                - Urologia clínica
                <br />
                <br />
                Doenças tratadas:
                <br />
                <br />
                - Cálculos Urinários
                <br />
                - Câncer da bexiga
                <br />
                - Câncer de próstata
                <br />
                - Câncer de rim
                <br />
                - Doenças dos rins e aparelho urinário
                <br />
                - Doenças Testiculares
                <br />
                - Doenças Urológicas
                <br />
                - Doença da Próstata
              </p>
              <br />
            </div>
          </div>
        
        {/* === CARD 4 === */}
          <div className="flex flex-col md:flex-row-reverse items-center md:items-start gap-8 mb-16 text-left">
            <div className="overflow-hidden rounded-2xl border border-gray-300 shadow-lg w-full md:w-[380px] h-[420px]">
              <img
                src="Rosaria-IA.png"
                alt="Dra. Maria Rosaria Cunha"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-2xl font-semibold text-gray-900">
                Dra. Maria Rosaria Cunha
              </h3>
              <p className="text-yellow-600 font-medium">
                Endocrinologista | CRM: 72825/SP - RQE 26853
              </p>
              <p className="text-gray-700 leading-relaxed">
                Dra. Maria Rosária Cunha, especialista em Endocrinologia e Metabologia, membro da Sociedade Brasileira de Endocrinologia, doutora em Endocrinologia e Metabologia pela faculdade de Medicina de São Paulo, com vasta experiência em medicina de urgência, obesidade, diabetes e endocrinopatias. Autora de vários capítulos de livros médicos e trabalhos publicados e revistas nacionais e internacionais.
                <br />
                <br />
                Experiência em:
                <br />
                <br />
                - Diabetologia
                <br />
                - Metabolismo mineral e ósseo
                <br />
                - Patologias da tireoide
                <br />
                - Reposição hormonal
                <br />
              </p>
            </div>
          </div>

{/* PLANOS DE SAÚDE */}
<section className="w-full bg-white text-gray-900 mt-20">
  <div className="max-w-6xl mx-auto px-6 text-center">
    <h2 className="text-4xl font-light mb-6">Planos de Saúde Atendidos</h2>
    <p className="text-slate-600 text-lg max-w-2xl mx-auto mb-10">
      A Clínica Dr. Roberto Nigro é credenciada com diversos planos de saúde
      para oferecer praticidade e acessibilidade no seu atendimento.
    </p>

    {/* Imagem */}
    <div className="flex justify-center">
      <div className="overflow-hidden rounded-2xl border border-gray-300 shadow-lg w-full max-w-4xl">
        <img
          src="/planos-saude.png"
          alt="Planos de saúde atendidos pela clínica"
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />
      </div>
    </div>
  </div>
</section>


<br />
<br />


        <SectionDivider />
      
        </div>   
      </section>

      {/* CTA LOGIN / PERFIL */}
      <section className="flex flex-col items-center justify-center py-5 bg-white px-6">
        {!user ? (
          <>
            <h2 className="text-4xl md:text-4xl font-light text-gray-950 mb-4">
              Nosso compromisso é o seu bem-estar
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mb-8">              
              Nossa equipe tem como objetivo a promoção da sua saúde, prezando
              pelo respeito e ética, buscando sempre realizar um tratamento
              personalizado e humano, onde o paciente é a nossa prioridade.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/login"
                className="bg-gray-950 text-white hover:bg-yellow-400 font-semibold px-6 py-3 rounded-lg shadow transition"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="bg-gray-950 text-white hover:bg-yellow-500 font-semibold px-6 py-3 rounded-lg shadow transition"
              >
                Cadastrar-se
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-light text-gray-950 mb-2">
              Olá, {user.displayName || user.email?.split("@")[0]}
            </h2>
            <p className="text-slate-700 mb-6">Seja bem-vindo de volta!</p>
            <Link
              to="/perfil"
              className="bg-gray-950 hover:bg-yellow-400 text-white font-semibold px-6 py-3 rounded-lg shadow transition"
            >
              Ir para meu perfil
            </Link>
          </>
        )}
      </section>

      {/* SLIDER OTIMIZADO */}
<section className="relative w-full bg-gray-800 text-white overflow-hidden">
  <div className="relative w-full h-[450px] sm:h-[550px] md:h-[650px] lg:h-[700px] overflow-hidden">
    {slides.map((slide, i) => (
      <img
        key={slide.img}
        src={slide.img}
        alt={slide.title}
        loading="lazy"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          i === index ? "opacity-70" : "opacity-0"
        }`}
        style={{ willChange: "opacity" }}
      />
    ))}
  </div>

  {/* 🔹 Textos do slide */}
  <div className="relative z-10 max-w-5xl mx-auto px-6 text-center -mt-[320px] md:-mt-[360px]">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <h3 className="text-2xl md:text-3xl font-light mb-3 text-yellow-400 drop-shadow-lg leading-snug break-words">
        {slides[index].title}
      </h3>
      <p className="text-slate-200 text-base md:text-lg max-w-2xl mx-auto drop-shadow-md leading-relaxed break-words">
        {slides[index].desc}
      </p>
    </motion.div>
  </div>

  {/* Indicadores */}
  <div className="relative flex justify-center mt-12 mb-10 space-x-3">
    {slides.map((_, i) => (
      <button
        key={i}
        onClick={() => setIndex(i)}
        className={`w-3 h-3 rounded-full transition-all duration-300 ${
          i === index ? "bg-yellow-400 scale-125" : "bg-slate-500"
        }`}
      ></button>
    ))}
  </div>
</section>



    </div>
    </div>
  );
}
