import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const temporaryPassword = process.env.DEFAULT_TEMP_PASSWORD || 'JDE@1234';
const operators = [
  ['edilson.souza', 'EDILSON COIMBRA DE SOUZA', 'CAFÉ CRU'], ['felipe.simoes', 'FELIPE JUSTINO SIMOES', 'CAFÉ CRU'], ['fernando.santos', 'FERNANDO JOSE DOS SANTOS', 'CAFÉ CRU'], ['jose.medeiros', 'JOSE ROBERTO DE MEDEIROS', 'CAFÉ CRU'], ['luiz.souza', 'LUIZ FELIPE DE SOUZA', 'CAFÉ CRU'], ['luiz.nascimento', 'LUIZ LAURENCO DO NASCIMENTO', 'CAFÉ CRU'], ['nilton.costa', 'NILTON FERREIRA DA COSTA', 'CAFÉ CRU'], ['thais.souza', 'THAIS OLIVEIRA SOUZA', 'CAFÉ CRU'],
  ['alex.teixeira', 'ALEX SANDRO ALVES TEIXEIRA', 'MOAGEM'], ['daniel.madureira', 'DANIEL ALMEIDA MADUREIRA', 'MOAGEM'], ['deivison.chaves', 'DEIVISON SOUZA ALVES CHAVES', 'MOAGEM'],
  ['rafael.santos', 'RAFAEL DA SILVA SANTOS', 'TORRADOR'], ['eduardo.candido', 'EDUARDO LUIS CANDIDO', 'TORRADOR'], ['edvaldo.silva', 'EDVALDO RENER DA SILVA', 'TORRADOR'], ['ivomar.costa', 'IVOMAR LOPES COSTA', 'TORRADOR'], ['joao.rodrigues', 'JOAO PEDRO ALVES RODRIGUES', 'TORRADOR'], ['vinicius.oliveira', 'VINICIUS RAMOS DE OLIVEIRA', 'TORRADOR'], ['edvan.santos', 'EDVAN HENRIQUE PIRES SANTOS', 'TORRADOR'],
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const michelle = await prisma.user.upsert({ where: { username: 'michellefaria' }, update: { name: 'MICHELLE FARIA', role: 'coordinator', coordinatorId: null, active: true, mustChangePassword: true }, create: { username: 'michellefaria', name: 'MICHELLE FARIA', role: 'coordinator', area: 'COORDENAÇÃO', jobTitle: 'Coordenadora', active: true, mustChangePassword: true, passwordHash } } });
  for (const [username, name, area] of operators) await prisma.user.upsert({ where: { username }, update: { name, area, coordinatorId: michelle.id, role: 'operator', active: true, mustChangePassword: true }, create: { username, name, area, jobTitle: 'Operador de Processos', coordinatorId: michelle.id, role: 'operator', active: true, mustChangePassword: true, passwordHash } });
}

main().finally(() => prisma.$disconnect());