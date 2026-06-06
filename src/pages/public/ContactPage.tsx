import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { ROUTES } from '@/utils/constants';

const supportEmail = 'suporte@linkhelp.app';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = [
      `Nome: ${name || 'Nao informado'}`,
      `Email: ${email || 'Nao informado'}`,
      '',
      message || 'Escreva sua mensagem aqui.',
    ].join('\n');
    const url = `mailto:${supportEmail}?subject=${encodeURIComponent(subject || 'Contato LinkHelp')}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(51,182,255,0.24),transparent_30%),radial-gradient(circle_at_78%_16%,rgba(37,99,255,0.22),transparent_34%),linear-gradient(180deg,#061B3D_0%,#050816_48%,#050816_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:42px_42px] opacity-[0.06]" />

      <main className="relative mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <section className="flex flex-col justify-center">
          <Link
            to={ROUTES.home}
            className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-sky-100 backdrop-blur-xl transition hover:bg-white/[0.1]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-sky-200 backdrop-blur-xl">
            <Headphones className="h-4 w-4" />
            Contato
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[0.98] tracking-tight sm:text-6xl">
            Fale com o LinkHelp.
          </h1>
          <p className="mt-6 max-w-xl text-base font-medium leading-8 text-[#C7D2FE]/80 sm:text-lg">
            Tem uma duvida, sugestao ou precisa de suporte? Envie sua mensagem e a equipe LinkHelp retorna assim que possivel.
          </p>

          <div className="mt-8 grid gap-3">
            <ContactInfo icon={Mail} title="Email" body={supportEmail} />
            <ContactInfo icon={Clock3} title="Atendimento" body="Segunda a sexta, em horario comercial" />
            <ContactInfo icon={MapPin} title="Base" body="Canada, operacao digital" />
          </div>
        </section>

        <section className="relative">
          <div className="absolute -inset-8 rounded-[3rem] bg-[#2563FF]/20 blur-3xl" />
          <form
            onSubmit={submit}
            className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.075] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.36)] backdrop-blur-2xl sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#33B6FF]">Mensagem</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Como podemos ajudar?</h2>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2563FF] text-white shadow-[0_18px_42px_rgba(37,99,255,0.34)]">
                <MessageCircle className="h-6 w-6" />
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome" value={name} onChange={setName} placeholder="Seu nome" />
              <Field label="Email" value={email} onChange={setEmail} placeholder="voce@email.com" type="email" />
            </div>
            <div className="mt-4">
              <Field label="Assunto" value={subject} onChange={setSubject} placeholder="Sobre o que voce quer falar?" />
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-sky-100/60">Mensagem</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={7}
                placeholder="Escreva sua mensagem..."
                className="w-full resize-none rounded-[1.35rem] border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold leading-6 text-white outline-none transition placeholder:text-sky-100/35 focus:border-[#33B6FF]/60 focus:bg-white/[0.1]"
              />
            </label>

            <button
              type="submit"
              className="mt-5 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#2563FF] px-6 text-sm font-black text-white shadow-[0_18px_42px_rgba(37,99,255,0.34)] transition hover:brightness-110"
            >
              Enviar mensagem
              <Send className="h-4 w-4" />
            </button>

            <div className="mt-5 rounded-[1.35rem] bg-white/[0.06] p-4 ring-1 ring-white/8">
              <p className="flex items-center gap-2 text-sm font-black text-white">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                Suporte seguro
              </p>
              <p className="mt-1 text-xs font-medium leading-6 text-[#C7D2FE]/72">
                O formulario abre seu aplicativo de e-mail com a mensagem preenchida. Nenhum dado e salvo no banco por enquanto.
              </p>
            </div>
          </form>
        </section>

        <section className="lg:col-span-2">
          <div className="flex flex-col items-center justify-between gap-5 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-center backdrop-blur-2xl sm:flex-row sm:text-left">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Ainda nao tem conta?</h2>
              <p className="mt-2 text-sm font-medium text-[#C7D2FE]/74">Crie seu acesso e comece a usar o LinkHelp.</p>
            </div>
            <Link
              to={ROUTES.signup}
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[#071D48] transition hover:bg-sky-50"
            >
              Criar conta
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-sky-100/60">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[50px] w-full rounded-[1.25rem] border border-white/10 bg-white/[0.08] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-sky-100/35 focus:border-[#33B6FF]/60 focus:bg-white/[0.1]"
      />
    </label>
  );
}

function ContactInfo({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Mail;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#2563FF]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-0.5 text-sm font-medium text-[#C7D2FE]/72">{body}</p>
      </div>
    </div>
  );
}
