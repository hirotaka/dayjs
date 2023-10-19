import { defineNuxtModule, addPlugin, addImports, createResolver, addTemplate } from '@nuxt/kit'

export interface RelativeTimeOptions {
  future: string,
  past: string,
  s: string,
  m: string,
  mm: string,
  h: string,
  hh: string,
  d: string,
  dd: string,
  M: string,
  MM: string,
  y: string,
  yy: string,
}

interface FormatOptions {
  LT: string,
  LTS: string,
  L: string,
  LL: string,
  LLL: string,
  LLLL: string,
}

interface DefaultLocaleOptions {
  name?: string
  weekdays?: string[]
  months?: string[]
  /**
   * The starting day of a week, 1 for Monday / 7 for Sunday
   */
  weekStart?: number
  /**
   * Ability to configure relatvieTime with updateLocale
   * https://day.js.org/docs/en/customization/relative-time
   */
  weekdaysShort?: string[]
  monthsShort?: string[]
  weekdaysMin?: string[]
  ordinal?: (n: number) => number | string
  formats?: FormatOptions
  relativeTime?: RelativeTimeOptions
}

// Module options TypeScript interface definition
export interface ModuleOptions {
  /**
   * An array of optional locales to load
   * @example ['en', 'fr']
   */

  locales?: string[]

  /**
   * The default locale to use
   */
  defaultLocale?: string | [string, DefaultLocaleOptions]


  /**
   * The default timezone to use
   */
  defaultTimezone?: string

  /**
   * An array of built-in optional plugins to load
   * @example ['timezone', 'utc']
   */

  plugins?: string[]

  /**
   * An array of external optional plugins to load
   * @example ['timezone', 'utc']
   */

  externalPlugins?: { name: string, package: string, option?: unknown }[]

}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'dayjs',
    configKey: 'dayjs',
    compatibility: {
      nuxt: '^3'
    }
  },
  // Default configuration options of the Nuxt module
  defaults: {
    locales: [],
    plugins: ['relativeTime', 'utc'],
    externalPlugins: [],
    defaultLocale: undefined,
    defaultTimezone: undefined,
  },
  setup(options, nuxt) {

    const resolver = createResolver(import.meta.url)
    options.plugins = [...new Set(options.plugins)]
    options.externalPlugins = [...new Set(options.externalPlugins)]

    if (options.defaultTimezone && !options.plugins.includes('timezone'))
      throw new Error('You must include the timezone plugin in order to set a default timezone')

    addPlugin(resolver.resolve('./runtime/plugin'))

		nuxt.options.alias["#dayjs"] = resolver.resolve("./runtime/composables/dayjs");
    addImports({
      name: 'useDayjs',
      as: 'useDayjs',
      from: nuxt.options.alias["#dayjs"]
    })

    addTemplate({
      filename: 'dayjs.imports.mjs',
      getContents: () => generateImports(options),
      write: true,
    })

    // Add dayjs plugin types
    nuxt.hook('prepare:types', ({ references }) => {
      if (options.plugins) {
        const plugins = options.plugins.map((p) => ({ types: `dayjs/plugin/${p}` }))
        references.push(...plugins)
      }
      if (options.externalPlugins) {
        const externalPlugins = options.externalPlugins.map((p) => ({ types: p.package }))
        references.push(...externalPlugins)
      }
    })
  }
})

const generateImports = ({ locales, plugins, externalPlugins, defaultLocale, defaultTimezone }: ModuleOptions) => `
// Generated by dayjs-nuxt-module
import dayjs from 'dayjs'
import updateLocale from 'dayjs/plugin/updateLocale'

${locales?.map(locale => `import 'dayjs/locale/${locale}'`).join('\n')}
${plugins?.map(plugin => `import ${plugin} from 'dayjs/plugin/${plugin}'`).join('\n')}
${externalPlugins?.map(plugin => `import ${plugin.name} from '${plugin.package}'`).join('\n')}

dayjs.extend(updateLocale)

${plugins?.map(plugin => `dayjs.extend(${plugin})`).join('\n')}
${externalPlugins?.map(plugin => `dayjs.extend(${plugin.name}, ${JSON.stringify(plugin.option)})`).join('\n')}
${defaultTimezone ? `dayjs.tz.setDefault('${defaultTimezone}')` : ''}

// defaultLocale: ${JSON.stringify(defaultLocale)}

${defaultLocale ? `
dayjs.updateLocale(${JSON.stringify(defaultLocale).replace(/^\[|\]$/g, '')})
dayjs.locale('${typeof defaultLocale === 'string' ? defaultLocale : defaultLocale[0]}')
` : ""}

export default dayjs
`
