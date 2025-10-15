import { Routes, Route, Link, useParams, useNavigate, NavLink } from "react-router-dom";
import React from "react";
import CanvasCodeSynthesis from "./components/CanvasCodeSynthesis.jsx";
import "./index.css";
import PERCCanvasCodeSynthesis from "./components/perc.jsx";
import { Menu, X, ExternalLink} from "lucide-react";
import { useState } from "react";
// export default function App() {
//     return <CanvasCodeSynthesis />;
// }


function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "relative px-3 py-1.5 rounded-xl text-sm font-medium transition-colors",
          "hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
          isActive ? "text-slate-900" : "text-slate-600",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {children}
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

/** 외부 링크 전용 아이템 (새 탭) */
function ExternalNavItem({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "relative inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors",
        "text-slate-700 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
      ].join(" ")}
      aria-label={`${children} (새 탭)`}
      title="새 탭에서 열기"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
    </a>
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
            {/* 순서: ARCHCODE, PERC, DAC */}
            <ExternalNavItem href="http://ldi.snu.ac.kr:5173">ARCHCODE</ExternalNavItem>
            <span className="mx-1 h-4 w-px align-middle inline-block bg-slate-200" />
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
            {/* 순서: ARCHCODE, PERC, DAC */}
            <a
              href="http://ldi.snu.ac.kr:5173"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
              onClick={() => setOpen(false)}
            >
              ARCHCODE <ExternalLink className="ml-1 inline h-3.5 w-3.5 opacity-70" />
            </a>
            <div className="my-1 h-px bg-slate-200" />
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
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 to-slate-100" />

        <section className="min-h-[calc(100vh-3.5rem)] flex items-center">
          <div className="mx-auto w-full max-w-5xl px-4 text-center">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              LDI Lab Autocoding Demo
            </h1>

            {/* 순서: ARCHCODE, PERC, DAC */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* ARCHCODE (외부 링크) */}
              <a
                href="http://ldi.snu.ac.kr:5173"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-2xl border bg-white/80 p-8 text-left shadow-sm ring-1 ring-inset ring-slate-200 transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                aria-label="Open ARCHCODE"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl border bg-amber-50 p-3 ring-1 ring-amber-100">
                    <span className="block h-6 w-6 rounded-md bg-amber-400/80" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-900">ARCHCODE</div>
                    <div className="text-sm text-slate-600">Incorporating Software Requirements in Code Generation with Large Language Models</div>
                  </div>
                </div>
                <span className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-amber-200/40 blur-2xl transition group-hover:scale-150" />
                <span className="mt-3 block text-xs text-amber-700/80">Open in new tab</span>
              </a>

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
                    <div className="text-sm text-slate-600">Plan-As-Query Example Retrieval</div>
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
                    <div className="text-sm text-slate-600">Decompose problem and then Compose retrieval</div>
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
