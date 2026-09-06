// Fixtures de desarrollo — SOLO para el front del portal, nunca se tocan
// desde services/ (esa carpeta es compartida con el sistema de administración).
//
// La forma de cada objeto de acá tiene que calcar exactamente lo que
// devuelve el service real (mismos nombres de campo, mismos objetos
// anidados) para que el día que haya conexión a Supabase, cambiar de
// mock a datos reales no rompa nada en las páginas.

export const alumnoDemo = {
  id: 'demo',
  nombre: 'Alumno',
  apellido: 'Demo',
  dni: '00000000',
}

// Ficha completa — la que devuelve getAlumnoById(), usada en Perfil.
export const alumnoPerfilDemo = {
  id: 'demo',
  nombre: 'Alumno',
  apellido: 'Demo',
  dni: '00000000',
  telefono: '351-555-0000',
  email: 'alumno.demo@example.com',
  domicilio: 'Barrio Observatorio, Córdoba',
  fecha_nacimiento: '2014-03-15',
  fecha_alta: '2026-03-02',
}

export const padresDemo = [
  { id: 'p-1', nombre: 'Tutor', apellido: 'Demo', telefono: '351-555-1111', email: 'tutor.demo@example.com' },
]

// Detalle completo por grupo — lo que devuelve getGrupoById(), usado en el
// modal de "Grupos" cuando no hay conexión real a Supabase todavía.
export const gruposDetalleDemo = {
  'g-1': {
    id: 'g-1',
    nombre: 'Ballet Intermedio',
    nivel: 'Intermedio',
    horario: 'Lunes y Miércoles 18:00–19:30',
    capacidad_maxima: 15,
    inscriptos_activos: 12,
    cuota_base_mensual: 15000,
    profesor: { id: 'prof-1', nombre: 'Lorena', apellido: 'Cosanelli', telefono: '351-555-2222', email: 'lorena.cosanelli@crear.com' },
  },
  'g-2': {
    id: 'g-2',
    nombre: 'Jazz Avanzado',
    nivel: 'Avanzado',
    horario: 'Viernes 19:00–20:30',
    capacidad_maxima: 12,
    inscriptos_activos: 10,
    cuota_base_mensual: 15000,
    profesor: { id: 'prof-2', nombre: 'Martina', apellido: 'Bordon', telefono: '351-555-3333', email: 'martina.bordon@crear.com' },
  },
}

export const notificacionesDemo = [
  {
    id: 'n-1',
    alumno_id: null,
    tipo: 'institucional',
    titulo: 'Receso de vacaciones de invierno',
    mensaje: 'La academia permanece cerrada del 20 al 28 de julio. ¡Nos vemos a la vuelta!',
    fecha_creacion: '2026-08-28T10:00:00',
    leida: false,
  },
  {
    id: 'n-2',
    alumno_id: 'demo',
    tipo: 'vencimiento',
    titulo: 'Vencimiento próximo',
    mensaje: 'Tu cuota de agosto vence el 31/08/2026.',
    fecha_creacion: '2026-08-27T09:00:00',
    leida: false,
  },
  {
    id: 'n-3',
    alumno_id: 'demo',
    tipo: 'inasistencia',
    titulo: 'Inasistencias reiteradas',
    mensaje: 'Registramos 3 ausencias seguidas en Ballet Intermedio. ¡Te esperamos en la próxima clase!',
    fecha_creacion: '2026-08-20T15:30:00',
    leida: true,
  },
  {
    id: 'n-4',
    alumno_id: null,
    tipo: 'evento',
    titulo: 'Muestra anual 2026',
    mensaje: 'Ya podés reservar tu entrada para la muestra de fin de año.',
    fecha_creacion: '2026-08-10T12:00:00',
    leida: true,
  },
]

export const inscripcionesDemo = [
  {
    id: 'insc-1',
    estado: 'activa',
    fecha: '2026-03-02',
    grupo_id: 'g-1',
    grupo: { id: 'g-1', nombre: 'Ballet Intermedio', nivel: 'Intermedio', horario: 'Lunes y Miércoles 18:00–19:30' },
  },
  {
    id: 'insc-2',
    estado: 'activa',
    fecha: '2026-03-02',
    grupo_id: 'g-2',
    grupo: { id: 'g-2', nombre: 'Jazz Avanzado', nivel: 'Avanzado', horario: 'Viernes 19:00–20:30' },
  },
]

export const cuotasDemo = [
  {
    id: 'c-3',
    alumno_id: 'demo',
    mes: '2026-08',
    monto: 15000,
    estado: 'pendiente',
    fecha_vencimiento: '2026-08-31',
    pagos: [],
  },
  {
    id: 'c-2',
    alumno_id: 'demo',
    mes: '2026-07',
    monto: 15000,
    estado: 'pagada',
    fecha_vencimiento: '2026-07-31',
    pagos: [{ id: 'p-2', monto_pagado: 15000, fecha_pago: '2026-07-05', metodo: 'efectivo' }],
  },
  {
    id: 'c-1',
    alumno_id: 'demo',
    mes: '2026-06',
    monto: 13500,
    estado: 'pagada',
    fecha_vencimiento: '2026-06-30',
    pagos: [{ id: 'p-1', monto_pagado: 13500, fecha_pago: '2026-06-03', metodo: 'transferencia' }],
  },
]

export const asistenciasDemo = [
  { id: 'a-1', alumno_id: 'demo', grupo_id: 'g-1', fecha: '2026-08-25', presente: true, grupos: { id: 'g-1', nombre: 'Ballet Intermedio' } },
  { id: 'a-2', alumno_id: 'demo', grupo_id: 'g-1', fecha: '2026-08-18', presente: true, grupos: { id: 'g-1', nombre: 'Ballet Intermedio' } },
  { id: 'a-3', alumno_id: 'demo', grupo_id: 'g-1', fecha: '2026-08-11', presente: false, grupos: { id: 'g-1', nombre: 'Ballet Intermedio' } },
  { id: 'a-4', alumno_id: 'demo', grupo_id: 'g-2', fecha: '2026-08-22', presente: true, grupos: { id: 'g-2', nombre: 'Jazz Avanzado' } },
  { id: 'a-5', alumno_id: 'demo', grupo_id: 'g-2', fecha: '2026-08-15', presente: true, grupos: { id: 'g-2', nombre: 'Jazz Avanzado' } },
]

export const eventosDemo = [
  {
    id: 'ev-1',
    nombre: 'Muestra Anual 2026',
    descripcion: 'Cierre de año de todas las disciplinas de la academia, en el Teatro Real.',
    fecha: '2026-12-05',
    hora: '19:00:00',
    lugar: 'Teatro Real, Córdoba',
    filas: 6,
    columnas: 8,
    asientos_deshabilitados: ['3-4', '3-5'],
    precio_entrada: 8000,
    estado: 'activo',
  },
  {
    id: 'ev-2',
    nombre: 'Gala de Jazz y Contemporáneo',
    descripcion: 'Presentación especial de los grupos avanzados de Jazz y Danza Contemporánea.',
    fecha: '2026-10-18',
    hora: '20:30:00',
    lugar: 'Auditorio CREAR',
    filas: 5,
    columnas: 6,
    asientos_deshabilitados: [],
    precio_entrada: 6000,
    estado: 'activo',
  },
]

// Asientos ya ocupados (pagados o reservados) por evento, para simular el
// mapa de la sala en modo demo — misma forma que getAsientosOcupados().
export const asientosOcupadosDemoPorEvento = {
  'ev-1': ['1-1', '1-2', '4-6'],
  'ev-2': ['2-3'],
}

export const entradasAlumnoDemo = [
  {
    id: 'ent-1',
    evento_id: 'ev-1',
    alumno_id: 'demo',
    fila: 1,
    columna: 1,
    precio: 8000,
    estado: 'pagado',
    codigo: 'A1B2C3D4',
    fecha_reserva: '2026-09-01T10:00:00',
    fecha_pago: '2026-09-01T10:05:00',
    eventos: { id: 'ev-1', nombre: 'Muestra Anual 2026', fecha: '2026-12-05', hora: '19:00:00', lugar: 'Teatro Real, Córdoba' },
  },
  {
    id: 'ent-2',
    evento_id: 'ev-1',
    alumno_id: 'demo',
    fila: 1,
    columna: 2,
    precio: 8000,
    estado: 'pagado',
    codigo: 'E5F6A7B8',
    fecha_reserva: '2026-09-01T10:00:00',
    fecha_pago: '2026-09-01T10:05:00',
    eventos: { id: 'ev-1', nombre: 'Muestra Anual 2026', fecha: '2026-12-05', hora: '19:00:00', lugar: 'Teatro Real, Córdoba' },
  },
]

export const evaluacionesDemo = [
  {
    id: 'e-1',
    alumno_id: 'demo',
    grupo_id: 'g-1',
    fecha: '2026-07-20',
    grupos: { id: 'g-1', nombre: 'Ballet Intermedio' },
    plantillas_evaluacion: { id: 'pl-1', nombre: 'Evaluación trimestral' },
    evaluacion_detalle: [
      { criterio_id: 'cr-1', nota: 8, observacion: 'Buena elongación', criterios: { nombre: 'Técnica' } },
      { criterio_id: 'cr-2', nota: 7, observacion: 'Mejoró bastante desde la anterior', criterios: { nombre: 'Musicalidad' } },
    ],
  },
]
