import { Routes, Route, Link, useParams, useNavigate, NavLink } from "react-router-dom";
import React from "react";
import CanvasCodeSynthesis from "./components/CanvasCodeSynthesis.jsx";
import "./index.css";
import PERCCanvasCodeSynthesis from "./components/perc.jsx";
import {AlertCircle, KeyRound} from "lucide-react";

// export default function App() {
//     return <CanvasCodeSynthesis />;
// }
import { useState } from "react";
import { Menu, X } from "lucide-react";

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "relative px-3 py-1.5 rounded-xl text-sm font-medium transition-colors",
          "hover:text-slate-900",
          isActive ? "text-slate-900" : "text-slate-600",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {children}
          {/* active underline pill */}
          <span
            className={[
              "absolute inset-x-1 -bottom-1 h-1 rounded-full transition-all",
              isActive ? "bg-slate-900/80" : "bg-transparent",
            ].join(" ")}
          />
        </>
      )}
    </NavLink>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Brand */}
        <Link to="/" className="group inline-flex items-center gap-2">
          <img src="/ldi-logo.svg" width={28} height={28} alt="LDI logo" className="rounded-md ring-1 ring-slate-900/5" />
          <span className="font-semibold tracking-tight text-slate-800 group-hover:text-slate-900">
            LDI Lab <span className="hidden sm:inline">Autocoding Demo</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <div className="rounded-full border bg-white/70 px-1 py-0.5 shadow-sm">
            <NavItem to="/perc">PERC</NavItem>
            <span className="mx-1 h-4 w-px align-middle inline-block bg-slate-200" />
              <NavItem to="/dac">DAC</NavItem>
          </div>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center rounded-xl border px-2.5 py-1.5 text-slate-700 hover:bg-white md:hidden"
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <div className="md:hidden">
          <div className="mx-4 mb-3 rounded-2xl border bg-white/80 p-2 shadow-sm backdrop-blur">
            <NavItem to="/perc" onClick={() => setOpen(false)}>
              PERC
            </NavItem>
            <div className="my-1 h-px bg-slate-200" />
            <NavItem to="/dac" onClick={() => setOpen(false)}>
              DAC
            </NavItem>

          </div>
        </div>
      )}
    </header>
  );
}

function Home() {
  return (
    <>
      <Navbar />

      {/* Landing section */}
      <main className="relative isolate">
        {/* 그라디언트 배경 */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 to-slate-100" />

        {/* 헤더 높이(3.5rem = h-14)만큼 뺀 뒤 정중앙 정렬 */}
        <section className="min-h-[calc(100vh-3.5rem)] flex items-center">
          <div className="mx-auto w-full max-w-4xl px-4 text-center">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              LDI Lab Autocoding Demo
            </h1>
            {/*<p className="mt-2 text-slate-600">*/}
            {/*  모드를 선택하세요. 간소화된 파이프라인(DAC) 또는 검색/인식 기반(PERC).*/}
            {/*</p>*/}
{/* 큼직한 선택 버튼 2개 — 순서: PERC, DAC */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* PERC */}
              <Link
                to="/perc"
                className="group relative overflow-hidden rounded-2xl border bg-white/80 p-8 text-left shadow-sm ring-1 ring-inset ring-slate-200 transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                aria-label="Go to PERC"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl border bg-cyan-50 p-3 ring-1 ring-cyan-100">
                    <span className="block h-6 w-6 rounded-md bg-cyan-400/80" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-900">PERC</div>
                    <div className="text-sm text-slate-600">
                      Plan-as-Query Example Retrieval
                    </div>
                  </div>
                </div>
                <span className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-200/40 blur-2xl transition group-hover:scale-150" />
              </Link>

              {/* DAC */}
              <Link
                to="/dac"
                className="group relative overflow-hidden rounded-2xl border bg-white/80 p-8 text-left shadow-sm ring-1 ring-inset ring-slate-200 transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                aria-label="Go to DAC"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl border bg-violet-50 p-3 ring-1 ring-violet-100">
                    <span className="block h-6 w-6 rounded-md bg-violet-400/80" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-900">DAC</div>
                    <div className="text-sm text-slate-600">
                      Decompose problem then Compose retrieval
                    </div>
                  </div>
                </div>
                <span className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-violet-200/40 blur-2xl transition group-hover:scale-150" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function PERC() {
  return <PERCCanvasCodeSynthesis/>;
}

function DAC () {
    return <CanvasCodeSynthesis/>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/perc" element={<PERC />} />
      <Route path="/dac" element={<DAC />} />
      <Route path="*" element={<h1>404 Not Found</h1>} />
    </Routes>
  );
}
