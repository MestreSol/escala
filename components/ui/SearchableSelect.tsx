"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { fieldClasses } from "@/components/ui/Field";

export type SearchableOption = { value: string; label: string };

type SearchableSelectProps = {
  name: string;
  options: SearchableOption[];
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  /** Opção extra pro valor "vazio" (ex: "Vaga em aberto"), listada no topo. */
  emptyOptionLabel?: string;
  /** Avisado quando o usuário escolhe uma opção (pra uso fora de <form>). */
  onValueChange?: (value: string) => void;
};

/**
 * Combobox com busca por texto, mas que ainda submete um `value` (id) via
 * form action normal — como as listas de servidor podem crescer bastante,
 * um <select> nativo fica ruim de navegar; digitar filtra pelo nome.
 */
export function SearchableSelect({
  name,
  options,
  defaultValue = "",
  placeholder = "Digite para buscar...",
  className,
  emptyOptionLabel,
  onValueChange,
}: SearchableSelectProps) {
  const todasOpcoes = useMemo(
    () => (emptyOptionLabel ? [{ value: "", label: emptyOptionLabel }, ...options] : options),
    [options, emptyOptionLabel]
  );

  const [valorSelecionado, setValorSelecionado] = useState(defaultValue);
  const [busca, setBusca] = useState(() => todasOpcoes.find((o) => o.value === defaultValue)?.label ?? "");
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return todasOpcoes;
    return todasOpcoes.filter((o) => o.label.toLowerCase().includes(termo));
  }, [busca, todasOpcoes]);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
        // Se digitou algo e saiu sem escolher uma opção, volta pro rótulo do valor realmente selecionado.
        setBusca(todasOpcoes.find((o) => o.value === valorSelecionado)?.label ?? "");
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [valorSelecionado, todasOpcoes]);

  function escolher(opcao: SearchableOption) {
    setValorSelecionado(opcao.value);
    setBusca(opcao.label);
    setAberto(false);
    onValueChange?.(opcao.value);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={valorSelecionado} />
      <input
        type="text"
        value={busca}
        onChange={(evento) => {
          setBusca(evento.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={(evento) => {
          if (evento.key === "Enter") {
            evento.preventDefault();
            if (filtradas.length > 0) escolher(filtradas[0]);
          } else if (evento.key === "Escape") {
            setAberto(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={clsx(fieldClasses, className)}
      />
      {aberto && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full animate-fade-in overflow-auto rounded-md border border-line bg-surface-2 p-1 text-sm shadow-2xl shadow-black/50">
          {filtradas.length === 0 ? (
            <li className="px-3 py-2 text-subtle">Nada encontrado</li>
          ) : (
            filtradas.map((opcao) => (
              <li key={opcao.value}>
                <button
                  type="button"
                  onMouseDown={(evento) => evento.preventDefault()}
                  onClick={() => escolher(opcao)}
                  className={clsx(
                    "block w-full rounded px-3 py-2 text-left text-muted transition-colors hover:bg-accent-soft hover:text-fg",
                    opcao.value === valorSelecionado && "bg-accent-soft font-medium text-accent"
                  )}
                >
                  {opcao.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
