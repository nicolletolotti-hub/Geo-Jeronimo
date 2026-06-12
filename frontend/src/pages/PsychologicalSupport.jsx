import React from 'react';
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const resources = [
  {
    title: 'CVV - Centro de Valorização da Vida',
    description: 'Apoio emocional e prevenção do suicídio, atendendo voluntária e gratuitamente todas as pessoas que querem e precisam conversar, sob total sigilo por telefone, email e chat 24 horas todos os dias.',
    phone: '188',
    link: 'https://www.cvv.org.br/',
  },
  {
    title: 'CAPS - Centros de Atenção Psicossocial',
    description: 'Serviço da rede pública de saúde que oferece atendimento a pessoas com transtornos mentais graves e persistentes. Procure o CAPS mais próximo de sua residência.',
    phone: 'Consulte sua prefeitura',
    link: '#',
  },
  {
    title: 'TelessaúdeRS-UFRGS',
    description: 'Oferece teleconsultorias e materiais de apoio para profissionais de saúde, mas também disponibiliza canais de informação e auxílio para o público em geral em situações de crise.',
    phone: '',
    link: 'https://www.ufrgs.br/telessauders/',
  },
];

function PsychologicalSupport() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-100 mb-3">Apoio Psicológico</h1>
        <p className="text-lg text-slate-400">
          Enfrentar uma enchente é um desafio imenso. Você não está sozinho.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource, index) => (
          <Card key={index} className="flex flex-col border-slate-800 hover:border-primary-500/30 transition-all duration-300 hover:shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-slate-100">{resource.title}</CardTitle>
              <CardDescription className="text-base leading-relaxed text-slate-400">{resource.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow pb-4">
              {resource.phone && (
                <div className="mb-4 bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <span className="font-semibold text-slate-300 text-sm">Telefone:</span>
                  <p className="text-slate-100 font-bold text-lg">{resource.phone}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-4">
              <a href={resource.link} target="_blank" rel="noopener noreferrer" className="w-full">
                <Button variant="primary" className="w-full py-3 font-semibold shadow-lg hover:shadow-xl transition-all">
                  Acessar Site
                </Button>
              </a>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 bg-slate-800/50 p-8 rounded-2xl border border-slate-700 text-center">
        <p className="text-lg font-medium text-slate-200 mb-2">Lembre-se: Cuidar da sua saúde mental é tão importante quanto cuidar da sua segurança física.</p>
        <p className="text-base text-slate-400">Procure ajuda profissional se sentir que precisa.</p>
      </div>
    </div>
  );
}

export default PsychologicalSupport;
