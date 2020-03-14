import React, { CSSProperties } from "react"

type Loading = "lazy" | "eager"
type CrossOrigin = "anonymous" | "use-credentials" | ""

interface ImageObject {
  width: number
  height: number
  src: string
  srcSet: string
  base64?: string
  tracedSVG?: string
  srcWebp?: string
  srcSetWebp?: string
  media?: string
}

export interface FixedObject {
  width: number
  height: number
  src: ImageObject["src"]
  srcSet: ImageObject["srcSet"]
  base64?: ImageObject["base64"]
  tracedSVG?: ImageObject["tracedSVG"]
  srcWebp?: ImageObject["srcWebp"]
  srcSetWebp?: ImageObject["srcSetWebp"]
  media?: ImageObject["media"]
}

export interface FluidObject {
  aspectRatio: number
  src: ImageObject["src"]
  srcSet: ImageObject["srcSet"]
  sizes: string
  base64?: ImageObject["base64"]
  tracedSVG?: ImageObject["tracedSVG"]
  srcWebp?: ImageObject["srcWebp"]
  srcSetWebp?: ImageObject["srcSetWebp"]
  media?: ImageObject["media"]
}

type NoscriptImgProps = {
  src?: string
  sizes?: string
  title?: string
  srcSet?: string
  alt?: string
  width?: number
  height?: number
  crossOrigin?: CrossOrigin
  loading?: Loading
  draggable?: boolean
  imageVariants: ImageVariants[]
}

type ImageVariants = FixedObject | FluidObject

// If you modify these propTypes, please don't forget to update following files as well:
// https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-image/index.d.ts
// https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-image/README.md#gatsby-image-props
// https://github.com/gatsbyjs/gatsby/blob/master/docs/docs/gatsby-image.md#gatsby-image-props
export interface GatsbyImageProps {
  resolutions?: FixedObject
  sizes?: FluidObject
  fixed?: FixedObject | FixedObject[]
  fluid?: FluidObject | FluidObject[]
  fadeIn?: boolean
  durationFadeIn?: number
  title?: string
  alt?: string
  className?: string | object
  critical?: boolean
  crossOrigin?: CrossOrigin
  style?: CSSProperties
  imgStyle?: CSSProperties
  placeholderStyle?: object
  placeholderClassName?: string
  backgroundColor?: string | boolean
  onLoad?: () => void
  onError?: (event: any) => void
  onStartLoad?: (param: { wasCached: boolean }) => void
  Tag?: string | React.ReactType
  itemProp?: string
  loading?: Loading
  draggable?: boolean
}

type ConvertedProps = Omit<GatsbyImageProps, "resolutions" | "sizes">

interface PlaceholderImageProps {
  title?: GatsbyImageProps["title"]
  alt?: GatsbyImageProps["alt"]
  style?: GatsbyImageProps["style"]
  className?: GatsbyImageProps["className"]
  itemProp?: GatsbyImageProps["itemProp"]
}

interface PlaceholderProps {
  src: string
  imageVariants: ImageVariants[]
  generateSources: (props: ImageVariants[]) => React.ReactElement[]
  spreadProps: PlaceholderImageProps
  ariaHidden: boolean
}

interface ImgPropTypes {
  alt?: GatsbyImageProps["alt"]
  title?: GatsbyImageProps["title"]
  width?: ImageObject["width"]
  height?: ImageObject["height"]
  sizes?: FluidObject["sizes"]
  srcSet?: ImageObject["srcSet"]
  src: ImageObject["src"]
  crossOrigin?: GatsbyImageProps["crossOrigin"]
  style?: CSSProperties
  onLoad?: GatsbyImageProps["onLoad"]
  onError?: GatsbyImageProps["onError"]
  itemProp?: GatsbyImageProps["itemProp"]
  loading?: GatsbyImageProps["loading"]
  draggable?: GatsbyImageProps["draggable"]
  ariaHidden?: boolean
}

function isFluidObject(variant: ImageVariants): variant is FluidObject {
  return (variant as FluidObject).sizes !== undefined
}

const logDeprecationNotice = (prop: string, replacement: string): void => {
  if (process.env.NODE_ENV === `production`) {
    return
  }

  console.log(
    `
    The "${prop}" prop is now deprecated and will be removed in the next major version
    of "gatsby-image".
    `
  )

  if (replacement) {
    console.log(`Please use ${replacement} instead of "${prop}".`)
  }
}

// Handle legacy props during their deprecation phase
const convertProps = (props: GatsbyImageProps): ConvertedProps => {
  let convertedProps = { ...props }
  const { resolutions, sizes, critical } = convertedProps

  if (resolutions) {
    convertedProps.fixed = resolutions
    delete convertedProps.resolutions
  }
  if (sizes) {
    convertedProps.fluid = sizes
    delete convertedProps.sizes
  }

  if (critical) {
    logDeprecationNotice(`critical`, `the native "loading" attribute`)
    convertedProps.loading = `eager`
  }

  // convert fluid & fixed to arrays so we only have to work with arrays
  return {
    ...convertedProps,
    fixed:
      convertedProps.fixed &&
      (groupByMedia(new Array().concat(convertedProps.fixed)) as FixedObject[]),
    fluid:
      convertedProps.fluid &&
      (groupByMedia(new Array().concat(convertedProps.fluid)) as FluidObject[]),
  }
}

/**
 * Checks if fluid or fixed are art-direction arrays.
 *
 * @param currentData  {{media?: string}[]}   The props to check for images.
 * @return {boolean}
 */
const hasArtDirectionSupport = (currentData: ImageVariants[]): boolean =>
  !!currentData && currentData.some(image => typeof image.media !== `undefined`)

/**
 * Tries to detect if a media query matches the current viewport.
 * @property media   {{media?: string}}  A media query string.
 * @return {boolean}
 */
const matchesMedia = ({ media }: { media?: string }): boolean =>
  media ? isBrowser && !!window.matchMedia(media).matches : false

/**
 * Find the source of an image to use as a key in the image cache.
 * Use `the first image in either `fixed` or `fluid`
 * @param {{fluid: {src: string, media?: string}[], fixed: {src: string, media?: string}[]}} args
 * @return {string}
 */
const getImageSrcKey = ({
  fluid,
  fixed,
}: Pick<GatsbyImageProps, "fluid" | "fixed">): string | undefined => {
  const data = fluid
    ? getCurrentSrcData(fluid)
    : fixed
    ? getCurrentSrcData(fixed)
    : undefined

  return data && data.src
}

/**
 * Returns the current src - Preferably with art-direction support.
 * @param currentData  {{media?: string}[]}   The fluid or fixed image array.
 * @return {{src: string, media?: string}}
 */
const getCurrentSrcData = (
  currentData: ImageVariants | ImageVariants[]
): ImageVariants => {
  if (
    isBrowser &&
    currentData &&
    Array.isArray(currentData) &&
    hasArtDirectionSupport(currentData)
  ) {
    // Do we have an image for the current Viewport?
    const foundMedia = currentData.findIndex(matchesMedia)
    if (foundMedia !== -1) {
      return currentData[foundMedia]
    }
  }
  // Else return the first image.
  return currentData[0]
}

// Cache if we've seen an image before so we don't bother with
// lazy-loading & fading in on subsequent mounts.
const imageCache: { [key: string]: boolean } = Object.create({})
const inImageCache = (props: GatsbyImageProps): boolean => {
  const convertedProps = convertProps(props)
  // Find src
  const src = getImageSrcKey(convertedProps)
  return src && imageCache[src] ? imageCache[src] : false
}

const activateCacheForImage = (props: GatsbyImageProps): void => {
  const convertedProps = convertProps(props)
  // Find src
  const src = getImageSrcKey(convertedProps)
  if (src) imageCache[src] = true
}

// Native lazy-loading support: https://addyosmani.com/blog/lazy-loading/
const hasNativeLazyLoadSupport =
  typeof HTMLImageElement !== `undefined` &&
  `loading` in HTMLImageElement.prototype

const isBrowser = typeof window !== `undefined`
const hasIOSupport = isBrowser && window.IntersectionObserver

let io: IntersectionObserver | undefined
const listeners = new WeakMap()

function getIO(): IntersectionObserver | undefined {
  if (
    typeof io === `undefined` &&
    typeof window !== `undefined` &&
    window.IntersectionObserver
  ) {
    io = new window.IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (listeners.has(entry.target)) {
            const cb = listeners.get(entry.target)
            // Edge doesn't currently support isIntersecting, so also test for an intersectionRatio > 0
            if (entry.isIntersecting || entry.intersectionRatio > 0) {
              io!.unobserve(entry.target)
              listeners.delete(entry.target)
              cb()
            }
          }
        })
      },
      { rootMargin: `200px` }
    )
  }

  return io
}

function generateImageSources(imageVariants: ImageVariants[]): JSX.Element[] {
  return imageVariants.map(variant => (
    <React.Fragment key={variant.src}>
      {variant.srcSetWebp && (
        <source
          type="image/webp"
          media={variant.media}
          srcSet={variant.srcSetWebp}
          sizes={isFluidObject(variant) ? variant.sizes : undefined}
        />
      )}
      <source
        media={variant.media}
        srcSet={variant.srcSet}
        sizes={isFluidObject(variant) ? variant.sizes : undefined}
      />
    </React.Fragment>
  ))
}

// Return an array ordered by elements having a media prop, does not use
// native sort, as a stable sort is not guaranteed by all browsers/versions
function groupByMedia(imageVariants: ImageVariants[]): ImageVariants[] {
  const withMedia: ImageVariants[] = []
  const without: ImageVariants[] = []
  imageVariants.forEach(variant =>
    (variant.media ? withMedia : without).push(variant)
  )

  if (without.length > 1 && process.env.NODE_ENV !== `production`) {
    console.warn(
      `We've found ${without.length} sources without a media property. They might be ignored by the browser, see: https://www.gatsbyjs.org/packages/gatsby-image/#art-directing-multiple-images`
    )
  }

  return [...withMedia, ...without]
}

function generateTracedSVGSources(
  imageVariants: ImageVariants[]
): React.ReactElement[] {
  return imageVariants.map(({ src, media, tracedSVG }) => (
    <source key={src} media={media} srcSet={tracedSVG} />
  ))
}

function generateBase64Sources(
  imageVariants: ImageVariants[]
): React.ReactElement[] {
  return imageVariants.map(({ src, media, base64 }) => (
    <source key={src} media={media} srcSet={base64} />
  ))
}

function generateNoscriptSource(
  variant: ImageVariants,
  isWebp?: boolean
): string {
  const src = isWebp ? variant.srcSetWebp : variant.srcSet
  const mediaAttr = variant.media ? `media="${variant.media}" ` : ``
  const typeAttr = isWebp ? `type='image/webp' ` : ``
  const sizesAttr =
    isFluidObject(variant) && variant.sizes ? `sizes="${variant.sizes}" ` : ``

  return `<source ${typeAttr}${mediaAttr}srcset="${src}" ${sizesAttr}/>`
}

function generateNoscriptSources(imageVariants: ImageVariants[]): string {
  return imageVariants
    .map(
      variant =>
        (variant.srcSetWebp ? generateNoscriptSource(variant, true) : ``) +
        generateNoscriptSource(variant)
    )
    .join(``)
}

const listenToIntersections = (
  el: Element,
  cb: () => void
): (() => void) | void => {
  const observer = getIO()

  if (observer) {
    observer.observe(el)
    listeners.set(el, cb)
  } else {
    return
  }

  return (): void => {
    observer.unobserve(el)
    listeners.delete(el)
  }
}

const noscriptImg = (props: NoscriptImgProps): string => {
  // Check if prop exists before adding each attribute to the string output below to prevent
  // HTML validation issues caused by empty values like width="" and height=""
  const src = props.src ? `src="${props.src}" ` : `src="" ` // required attribute
  const sizes = props.sizes ? `sizes="${props.sizes}" ` : ``
  const srcSet = props.srcSet ? `srcset="${props.srcSet}" ` : ``
  const title = props.title ? `title="${props.title}" ` : ``
  const alt = props.alt ? `alt="${props.alt}" ` : `alt="" ` // required attribute
  const width = props.width ? `width="${props.width}" ` : ``
  const height = props.height ? `height="${props.height}" ` : ``
  const crossOrigin = props.crossOrigin
    ? `crossorigin="${props.crossOrigin}" `
    : ``
  const loading = props.loading ? `loading="${props.loading}" ` : ``
  const draggable = props.draggable ? `draggable="${props.draggable}" ` : ``

  const sources = generateNoscriptSources(props.imageVariants)

  return `<picture>${sources}<img ${loading}${width}${height}${sizes}${srcSet}${src}${alt}${title}${crossOrigin}${draggable}style="position:absolute;top:0;left:0;opacity:1;width:100%;height:100%;object-fit:cover;object-position:center"/></picture>`
}

// Earlier versions of gatsby-image during the 2.x cycle did not wrap
// the `Img` component in a `picture` element. This maintains compatibility
// until a breaking change can be introduced in the next major release
const Placeholder: React.FC<PlaceholderProps> = ({
  src,
  imageVariants,
  generateSources,
  spreadProps,
  ariaHidden,
}) => {
  const baseImage = <Img src={src} {...spreadProps} ariaHidden={ariaHidden} />

  return imageVariants.length > 1 ? (
    <picture>
      {generateSources(imageVariants)}
      {baseImage}
    </picture>
  ) : (
    baseImage
  )
}

const Img = React.forwardRef(
  (props: ImgPropTypes, ref: React.Ref<HTMLImageElement>) => {
    const {
      alt,
      sizes,
      srcSet,
      src,
      style,
      onLoad,
      onError,
      loading,
      draggable,
      // `ariaHidden`props is used to exclude placeholders from the accessibility tree.
      ariaHidden,
      ...otherProps
    } = props

    return (
      <img
        alt={alt}
        aria-hidden={ariaHidden}
        sizes={sizes}
        srcSet={srcSet}
        src={src}
        {...otherProps}
        onLoad={onLoad}
        onError={onError}
        ref={ref}
        // @ts-ignore : need to update @types/react
        loading={loading}
        draggable={draggable}
        style={{
          position: `absolute`,
          top: 0,
          left: 0,
          width: `100%`,
          height: `100%`,
          objectFit: `cover`,
          objectPosition: `center`,
          ...style,
        }}
      />
    )
  }
)

type State = {
  isVisible: boolean
  imgLoaded: boolean
  imgCached: boolean
  fadeIn: boolean
}

export class Image extends React.Component<GatsbyImageProps, State> {
  seenBefore: boolean
  isCritical: boolean
  addNoScript: boolean
  useIOSupport: boolean
  imageRef: React.RefObject<HTMLImageElement>
  cleanUpListeners?: void | (() => void)

  public static defaultProps = {
    fadeIn: true,
    durationFadeIn: 500,
    alt: ``,
    Tag: `div`,
    // We set it to `lazy` by default because it's best to default to a performant
    // setting and let the user "opt out" to `eager`
    loading: `lazy`,
  }

  constructor(props: GatsbyImageProps) {
    super(props)

    // If this image has already been loaded before then we can assume it's
    // already in the browser cache so it's cheap to just show directly.
    this.seenBefore = isBrowser && inImageCache(props)

    this.isCritical = props.loading === `eager` || props.critical || false

    this.addNoScript = !(this.isCritical && !props.fadeIn)
    this.useIOSupport =
      !hasNativeLazyLoadSupport &&
      hasIOSupport &&
      !this.isCritical &&
      !this.seenBefore

    const isVisible: boolean =
      this.isCritical ||
      (isBrowser && (hasNativeLazyLoadSupport || !this.useIOSupport))

    this.state = {
      isVisible,
      imgLoaded: false,
      imgCached: false,
      fadeIn: (!this.seenBefore && props.fadeIn) || false,
    } as State

    this.imageRef = React.createRef()
    this.handleImageLoaded = this.handleImageLoaded.bind(this)
    this.handleRef = this.handleRef.bind(this)
  }

  public componentDidMount(): void {
    if (this.state.isVisible && typeof this.props.onStartLoad === `function`) {
      this.props.onStartLoad({ wasCached: inImageCache(this.props) })
    }
    if (this.isCritical) {
      const img = this.imageRef.current
      if (img && img.complete) {
        this.handleImageLoaded()
      }
    }
  }

  public componentWillUnmount(): void {
    if (this.cleanUpListeners) {
      this.cleanUpListeners()
    }
  }

  // Specific to IntersectionObserver based lazy-load support
  public handleRef(ref: HTMLImageElement): void {
    if (this.useIOSupport && ref) {
      this.cleanUpListeners = listenToIntersections(ref, () => {
        const imageInCache = inImageCache(this.props)
        if (
          !this.state.isVisible &&
          typeof this.props.onStartLoad === `function`
        ) {
          this.props.onStartLoad({ wasCached: imageInCache })
        }

        // imgCached and imgLoaded must update after isVisible,
        // Once isVisible is true, imageRef becomes accessible, which imgCached needs access to.
        // imgLoaded and imgCached are in a 2nd setState call to be changed together,
        // avoiding initiating unnecessary animation frames from style changes.
        this.setState({ isVisible: true }, () =>
          this.setState({
            imgLoaded: imageInCache,
            // `currentSrc` should be a string, but can be `undefined` in IE,
            // !! operator validates the value is not undefined/null/""
            imgCached:
              !!this.imageRef.current && !!this.imageRef.current.currentSrc,
          })
        )
      })
    }
  }

  public handleImageLoaded(): void {
    activateCacheForImage(this.props)

    this.setState({ imgLoaded: true })

    if (this.props.onLoad) {
      this.props.onLoad()
    }
  }

  public render(): JSX.Element | null {
    const {
      title,
      alt,
      className,
      style = {},
      imgStyle = {},
      placeholderStyle = {},
      placeholderClassName,
      fluid,
      fixed,
      backgroundColor,
      durationFadeIn,
      Tag,
      itemProp,
      loading,
      draggable,
    } = convertProps(this.props) as ConvertedProps & { Tag: React.ReactType }

    const shouldReveal: boolean =
      this.state.fadeIn === false || this.state.imgLoaded
    const shouldFadeIn: boolean =
      this.state.fadeIn === true && !this.state.imgCached

    const imageStyle: CSSProperties = {
      opacity: shouldReveal ? 1 : 0,
      transition: shouldFadeIn ? `opacity ${durationFadeIn}ms` : `none`,
      ...imgStyle,
    }

    const bgColor: string | undefined =
      typeof backgroundColor === `boolean` ? `lightgray` : backgroundColor

    const delayHideStyle: CSSProperties = {
      transitionDelay: `${durationFadeIn}ms`,
    }

    const imagePlaceholderStyle: CSSProperties = {
      opacity: this.state.imgLoaded ? 0 : 1,
      ...(shouldFadeIn && delayHideStyle),
      ...imgStyle,
      ...placeholderStyle,
    }

    const placeholderImageProps: PlaceholderImageProps = {
      title,
      alt: !this.state.isVisible ? alt : ``,
      style: imagePlaceholderStyle,
      className: placeholderClassName,
      itemProp,
    }

    if (fluid) {
      const imageVariants = fluid as FluidObject[]
      const image = getCurrentSrcData(fluid) as FluidObject

      return (
        <Tag
          className={`${className ? className : ``} gatsby-image-wrapper`}
          style={{
            position: `relative`,
            overflow: `hidden`,
            ...style,
          }}
          ref={this.handleRef}
          key={`fluid-${JSON.stringify(image.srcSet)}`}
        >
          {/* Preserve the aspect ratio. */}
          <Tag
            aria-hidden
            style={{
              width: `100%`,
              paddingBottom: `${100 / image.aspectRatio}%`,
            }}
          />

          {/* Show a solid background color. */}
          {bgColor && (
            <Tag
              aria-hidden
              title={title}
              style={{
                backgroundColor: bgColor,
                position: `absolute`,
                top: 0,
                bottom: 0,
                opacity: !this.state.imgLoaded ? 1 : 0,
                right: 0,
                left: 0,
                ...(shouldFadeIn && delayHideStyle),
              }}
            />
          )}

          {/* Show the blurry base64 image. */}
          {image.base64 && (
            <Placeholder
              ariaHidden
              src={image.base64}
              spreadProps={placeholderImageProps}
              imageVariants={imageVariants}
              generateSources={generateBase64Sources}
            />
          )}

          {/* Show the traced SVG image. */}
          {image.tracedSVG && (
            <Placeholder
              ariaHidden
              src={image.tracedSVG}
              spreadProps={placeholderImageProps}
              imageVariants={imageVariants}
              generateSources={generateTracedSVGSources}
            />
          )}

          {/* Once the image is visible (or the browser doesn't support IntersectionObserver), start downloading the image */}
          {this.state.isVisible && (
            <picture>
              {generateImageSources(imageVariants)}
              <Img
                alt={alt}
                title={title}
                sizes={image.sizes}
                src={image.src}
                crossOrigin={this.props.crossOrigin}
                srcSet={image.srcSet}
                style={imageStyle}
                ref={this.imageRef}
                onLoad={this.handleImageLoaded}
                onError={this.props.onError}
                itemProp={itemProp}
                loading={loading}
                draggable={draggable}
              />
            </picture>
          )}

          {/* Show the original image during server-side rendering if JavaScript is disabled */}
          {this.addNoScript && (
            <noscript
              dangerouslySetInnerHTML={{
                __html: noscriptImg({
                  alt,
                  title,
                  loading,
                  ...image,
                  imageVariants,
                }),
              }}
            />
          )}
        </Tag>
      )
    }

    if (fixed) {
      const imageVariants = fixed as FixedObject[]
      const image = getCurrentSrcData(fixed) as FixedObject

      const divStyle: CSSProperties = {
        position: `relative`,
        overflow: `hidden`,
        display: `inline-block`,
        width: image.width,
        height: image.height,
        ...style,
      }

      if (style.display === `inherit`) {
        delete divStyle.display
      }

      return (
        <Tag
          className={`${className ? className : ``} gatsby-image-wrapper`}
          style={divStyle}
          ref={this.handleRef}
          key={`fixed-${JSON.stringify(image.srcSet)}`}
        >
          {/* Show a solid background color. */}
          {bgColor && (
            <Tag
              aria-hidden
              title={title}
              style={{
                backgroundColor: bgColor,
                width: image.width,
                opacity: !this.state.imgLoaded ? 1 : 0,
                height: image.height,
                ...(shouldFadeIn && delayHideStyle),
              }}
            />
          )}

          {/* Show the blurry base64 image. */}
          {image.base64 && (
            <Placeholder
              ariaHidden
              src={image.base64}
              spreadProps={placeholderImageProps}
              imageVariants={imageVariants}
              generateSources={generateBase64Sources}
            />
          )}

          {/* Show the traced SVG image. */}
          {image.tracedSVG && (
            <Placeholder
              ariaHidden
              src={image.tracedSVG}
              spreadProps={placeholderImageProps}
              imageVariants={imageVariants}
              generateSources={generateTracedSVGSources}
            />
          )}

          {/* Once the image is visible, start downloading the image */}
          {this.state.isVisible && (
            <picture>
              {generateImageSources(imageVariants)}
              <Img
                alt={alt}
                title={title}
                width={image.width}
                height={image.height}
                src={image.src}
                crossOrigin={this.props.crossOrigin}
                srcSet={image.srcSet}
                style={imageStyle}
                ref={this.imageRef}
                onLoad={this.handleImageLoaded}
                onError={this.props.onError}
                itemProp={itemProp}
                loading={loading}
                draggable={draggable}
              />
            </picture>
          )}

          {/* Show the original image during server-side rendering if JavaScript is disabled */}
          {this.addNoScript && (
            <noscript
              dangerouslySetInnerHTML={{
                __html: noscriptImg({
                  alt,
                  title,
                  loading,
                  ...image,
                  imageVariants,
                }),
              }}
            />
          )}
        </Tag>
      )
    }

    return null
  }
}
