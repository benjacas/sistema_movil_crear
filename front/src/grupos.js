import { getInscripcionesActivasByAlumno } from '../../services/inscripciones.js'
import { getGrupoById } from '../../services/grupos.js'
import { requireSesion } from './guard.js'
import { renderShell } from './components/shell.js'
import { abrirModal } from './components/modal.js'
import { conFallback } from './mock/dataSource.js'
import { inscripcionesDemo, gruposDetalleDemo } from './mock/mockData.js'
import { formatFecha, formatMoneda } from './utils/format.js'
import { parsearHorario, DIAS_SEMANA } from './utils/horario.js'

const alumno = requireSesion()
if (alumno) {
  renderShell({ active: 'grupos', title: 'Grupos' })
  cargarGrupos(alumno)
}

async function cargarGrupos(alumno) {
  const inscripciones = await conFallback(
    () => getInscripcionesActivasByAlumno(alumno.id),
    inscripcionesDemo,
    'grupos del alumno'
  )
  pintarCalendario(inscripciones)
  pintarGrupos(inscripciones)
}

//----------------------------CALENDARIO SEMANAL-----------------------------------------

/**
 * Agrupa las inscripciones activas por día de la semana, usando el parser
 * de `horario` en texto libre. Las que no se pudieron interpretar quedan
 * aparte, para mostrarlas igual (con su texto tal cual) y no perder datos.
 */
function construirCalendario(inscripciones) {
  const porDia = {}
  const sinHorarioEstructurado = []

  for (const i of inscripciones) {
    const bloques = parsearHorario(i.grupo?.horario)
    if (!bloques.length) {
      sinHorarioEstructurado.push(i)
      continue
    }
    for (const bloque of bloques) {
      if (!porDia[bloque.dia]) porDia[bloque.dia] = []
      porDia[bloque.dia].push({
        ...bloque,
        nombre: i.grupo?.nombre ?? 'Grupo',
        grupo_id: i.grupo_id,
        fecha: i.fecha,
      })
    }
  }

  for (const dia of Object.keys(porDia)) {
    porDia[dia].sort((a, b) => (a.horaInicio ?? '').localeCompare(b.horaInicio ?? ''))
  }

  return { porDia, sinHorarioEstructurado }
}

function pintarCalendario(inscripciones) {
  const contenedor = document.getElementById('calendario-semanal')
  const { porDia, sinHorarioEstructurado } = construirCalendario(inscripciones)
  const diasConClases = DIAS_SEMANA.filter((dia) => porDia[dia]?.length)

  if (!diasConClases.length && !sinHorarioEstructurado.length) {
    contenedor.innerHTML = '<p class="text-xs text-gray-400 px-1">Todavía no tenés clases asignadas.</p>'
    return
  }

  const tarjetasPorDia = diasConClases.map((dia) => `
    <div class="bg-white rounded-2xl border border-primary-light p-4 shadow-card">
      <p class="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">${dia}</p>
      <div class="space-y-2">
        ${porDia[dia].map((clase) => `
          <div
            data-grupo-id="${clase.grupo_id}"
            data-fecha="${clase.fecha}"
            class="flex items-center justify-between p-2.5 rounded-xl bg-primary-subtle cursor-pointer active:scale-[.99] transition-transform"
          >
            <div>
              <p class="text-sm font-semibold text-gray-800">${clase.nombre}</p>
              <p class="text-xs text-gray-400">${clase.horaInicio ? `${clase.horaInicio} – ${clase.horaFin}` : 'Horario a confirmar'}</p>
            </div>
            <span class="text-primary text-xs shrink-0">→</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')

  const notaSinHorario = sinHorarioEstructurado.length ? `
    <p class="text-[10px] text-gray-300 px-1">
      Otros horarios: ${sinHorarioEstructurado.map((i) => `${i.grupo?.nombre ?? 'Grupo'} (${i.grupo?.horario ?? 'a confirmar'})`).join(' · ')}
    </p>
  ` : ''

  contenedor.innerHTML = tarjetasPorDia + notaSinHorario

  contenedor.querySelectorAll('[data-grupo-id]').forEach((el) => {
    el.addEventListener('click', () => abrirDetalleGrupo(el.dataset.grupoId, el.dataset.fecha))
  })
}

//----------------------------LISTADO DE GRUPOS-----------------------------------------

function pintarGrupos(inscripciones) {
  const lista = document.getElementById('lista-grupos-detalle')
  if (!inscripciones.length) {
    lista.innerHTML = '<li class="text-xs text-gray-400 px-1">Todavía no tenés grupos asignados.</li>'
    return
  }

  lista.innerHTML = inscripciones.map((i) => `
    <li
      data-grupo-id="${i.grupo_id}"
      data-fecha="${i.fecha}"
      class="bg-white rounded-2xl border border-primary-light p-4 shadow-card cursor-pointer active:scale-[.99] transition-transform"
    >
      <div class="flex items-center justify-between">
        <p class="text-sm font-bold text-gray-800">${i.grupo?.nombre ?? 'Grupo'}</p>
        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-light text-primary">
          ${i.grupo?.nivel ?? '—'}
        </span>
      </div>
      <p class="text-xs text-gray-400 mt-1.5">${i.grupo?.horario ?? 'Horario a confirmar'}</p>
      <p class="text-[10px] text-primary font-semibold mt-2">Ver información de la disciplina →</p>
    </li>
  `).join('')

  lista.querySelectorAll('li[data-grupo-id]').forEach((li) => {
    li.addEventListener('click', () => abrirDetalleGrupo(li.dataset.grupoId, li.dataset.fecha))
  })
}

//----------------------------DETALLE (MODAL)-----------------------------------------

async function abrirDetalleGrupo(grupo_id, fechaInscripcion) {
  abrirModal('<p class="text-xs text-gray-400 py-6 text-center">Cargando información de la disciplina...</p>')

  const detalle = await conFallback(
    () => getGrupoById(grupo_id),
    gruposDetalleDemo[grupo_id] ?? null,
    'detalle del grupo'
  )

  if (!detalle) {
    abrirModal('<p class="text-sm text-gray-500 py-6 text-center">No pudimos cargar la información de este grupo.</p>')
    return
  }

  const cupoDisponible = (detalle.capacidad_maxima ?? 0) - (detalle.inscriptos_activos ?? 0)
  const profesor = detalle.profesor

  abrirModal(`
    <div class="flex items-start justify-between gap-3 mb-1 pr-6">
      <p class="text-base font-bold text-gray-800">${detalle.nombre}</p>
      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-light text-primary shrink-0 mt-0.5">
        ${detalle.nivel ?? '—'}
      </span>
    </div>
    <p class="text-xs text-gray-400 mb-4">Inscripto/a desde el ${formatFecha(fechaInscripcion)}</p>

    <div class="space-y-3">
      <div class="flex items-center justify-between p-3 rounded-xl bg-primary-subtle">
        <span class="text-xs text-gray-500">Horario</span>
        <span class="text-sm font-semibold text-gray-800">${detalle.horario ?? 'A confirmar'}</span>
      </div>
      <div class="flex items-center justify-between p-3 rounded-xl bg-primary-subtle">
        <span class="text-xs text-gray-500">Cupo del grupo</span>
        <span class="text-sm font-semibold text-gray-800">
          ${detalle.inscriptos_activos ?? '—'} / ${detalle.capacidad_maxima ?? '—'}
          ${cupoDisponible > 0 ? `<span class="text-emerald-500 font-normal text-xs">(${cupoDisponible} libres)</span>` : ''}
        </span>
      </div>
      ${detalle.cuota_base_mensual ? `
        <div class="flex items-center justify-between p-3 rounded-xl bg-primary-subtle">
          <span class="text-xs text-gray-500">Cuota mensual base</span>
          <span class="text-sm font-semibold text-gray-800">${formatMoneda(detalle.cuota_base_mensual)}</span>
        </div>
      ` : ''}
    </div>

    <p class="text-xs font-bold text-gray-700 mt-5 mb-2">Profesora a cargo</p>
    ${profesor ? `
      <div class="p-3 rounded-xl bg-primary-subtle space-y-1">
        <p class="text-sm font-semibold text-gray-800">${profesor.nombre} ${profesor.apellido}</p>
        ${profesor.telefono ? `<p class="text-xs text-gray-500">📞 ${profesor.telefono}</p>` : ''}
        ${profesor.email ? `<p class="text-xs text-gray-500">✉️ ${profesor.email}</p>` : ''}
      </div>
    ` : `
      <p class="text-xs text-gray-400">A confirmar.</p>
    `}
  `)
}
