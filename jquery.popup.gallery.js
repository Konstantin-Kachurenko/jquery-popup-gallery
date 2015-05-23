/** 
 * jQuery plugin 'gallery' v.1.0.2
 * Copyright (©) by Konstantin Kachurenko <konstantin.kachurenko@gmail.com>
 * The MIT License (MIT) http://opensource.org/licenses/MIT
 *
 * $(slector).popup({
 *   String    images  : '',
 *   Boolean   bubble  : true,
 *   Function  error   : null,
 *   Function  open    : null,
 *   Function  close   : null,
 *   Function  realign : null
 * });
 */
(function($) { "use strict";

    /** 
     * Открытие изображения 
     * @param Number change = undefined
     * @return undefined
     */ 
    function _open(change) {

        var href = this._preview instanceof jQuery? this._preview.attr('href'): this._preview;

        this._$image.off('load error');

        if ($(window).width() < 420) return window.location = href;

        this._$image = $('<img />').one('load error', $.proxy(function(change, e) {

            $(e.target).off('load error');

            setTimeout($.proxy(function(){

                this.$popup.attr({
                    'src': e.target.src,
                    'alt': e.target.src
                });

                this.$overlay.find('.popup-loader').add(this.$popup).removeClass('popup-show');

                if (change && this.$popup.hasClass('effect-slide')) 
                    this.$popup.removeClass('effect-slide-left effect-slide-right').addClass('effect-slide-'+(change > 0 ? 'left' : 'right'));

                if (e.type === 'error') this.options.error.apply(e.target, [href, this]);
                else this.constructor.prototype.open.call(this);

            }, this), change? 0: this.options.transition);

        }, this, change));

        this._$image.attr('src', href);
    }

    /** 
     * Получение соседних preview 
     * @param mixed preview
     * @return Array
     */ 
    function _get_siblings(preview) {
        var all = 
            this.options.images instanceof Array
                ? this.options.images
                : $(this.options.images).filter(function(i, elem) {
                    return preview instanceof jQuery && (!elem.hasAttribute('data-group') || $(elem).is('[data-group~="' + preview.attr('data-group') + '"]'));
                })
            ,
            check = $.proxy(function(direction) {
                var index = all[this.options.images instanceof Array? 'indexOf': 'index'].apply(all, [preview]) - direction;
                return (index > -1 && direction && index < all.length) 
                    ? all instanceof jQuery? all.eq(index): all[index] || []
                    : []
                ;
            }, this);
        return [check(-1), check(1)];
    }

    /** 
     * Актуализация состояния навигационных элементов 
     * @param mixed preview
     * @return undefined
     */ 
    function _navigate_to(preview) {
        clearTimeout(this._timeout);
        this._preview = preview;
        $.each(['next', 'prev'], $.proxy(function(nav, i, selector) {
            $.fn[nav[i].length ? 'addClass' : 'removeClass'].apply(this.find('.popup-nav-'+selector), ['popup-show']);
        }, this.$overlay, _get_siblings.apply(this, [preview])));
        this.$loader = this.overlay().$loader.clone(true).replaceAll(this.$loader).addClass('popup-show');
   }

    /** 
     * Анимированная смена изображения 
     * @param Number direction
     * @return undefined
     */ 
    function _change(direction) {
        var $next = direction ? _get_siblings.apply(this, [this._preview])[Number(direction > 0)] : [];
        if ($next.length) {
            _navigate_to.apply(this, [$next]);
            !this._timeout && this.$popup.addClass('effect-inverse-'+(direction > 0? 'left': 'right'));
            this._timeout = setTimeout($.proxy(function() {
                this._timeout = 0;
                _open.apply(this, arguments);
            }, this, Number(direction)), this.options.transition);
        } else if (!this._timeout) {
            this.realign();
        }
    }

    /** 
     * Callback запрета скролла страницы во время свайпа 
     * @param Object e
     * @return undefined
     */ 
    function _noscroll(e) {
        !$(e.target).closest('.popup-overlay, .popup').length && e.preventDefault();
    }

    /** 
     * Очистка стилей всплывающего блока после анимации 
     * @return undefined
     */ 
    function _clean_style() {
        this.removeAttribute('style');
        this.className = this.className.replace(/(^|\s+)effect-inverse-(?:left|right)/, '$1')
    }

    /** 
     * Безопасный вызов пользовательских обработчиков 
     * @param Function func
     * @return undefined
     */ 
    function _call(func) {
        func instanceof Function && func.call(this);
    }

    /** 
     * Обработчик клика по превью 
     * @param Object e
     * @return undefined
     */ 
    function _preview(e) {
        e.preventDefault();
        this.open($(e.currentTarget));
    }

    /** 
     * Конструктор объекта плагина 
     * 
     * @param HTMLElement element
     * @param Object options
     * @return undefined
     * 
     * @static
     * @param String selector
     * @param String effect
     * @return jQuery
     */ 
    $.gallery = function(element, options) {

        // Если статический вызов: $.gallery('a.image', 'effect-slide')
        if (this.constructor === Function) {
            
            var $popup = $('<img data-popup-js="" />').attr('class', void 0 === options? '': String(options));
            $('body').append($popup);

            if (element !== void 0) {
                options = {images: element};
            }
            return $popup.gallery(
                $.extend({}, options, {bubble: true})
            );
        }

        // Вызов родительского конструктора
        $.popup.apply(this, Array.prototype.slice.apply(arguments, [0]));
        
        // Добавление эффекта 'effect-slide' по умолчанию
        this.$popup.attr('class').search(/(^|\s)effect-/) < 0 && this.$popup.addClass('effect-slide');

        this.$popup.add(this.$overlay).addClass('popup-gallery');
        this._$image = $('<img />');

        var data;

        // Обработка Touch-событий
        this.$popup.on('touchstart', $.proxy(function(e) {

            var event = e.originalEvent || e,
                $target = $(e.target),
                clearance = ($(window).width() - $target.outerWidth(false)) / 2;

            // Кеширование данных для обработки 'touchmove'
            data = (event.touches && event.touches.length) ? {
                touch: event.touches[0].pageX,
                margin: parseInt($target.css('margin-left')),
                siblings: _get_siblings.apply(this, [this._preview]),
                clearance: Math.round(clearance - clearance * 0.1)
            } : {};

        }, this)).on('touchmove', function(e) {

            var event = e.originalEvent || e,
                offset;

            if (event.touches && event.touches.length === 1) {
                e.preventDefault();
                offset = event.touches[0].pageX - data.touch;
                if (Math.abs(offset) < data.clearance || data.siblings[Number(offset > 0)].length) e.target.style.marginLeft = data.margin + offset + 'px';
            }

        }).on('touchend', $.proxy(function(e) {

            var style = e.target.style;
            var diff = data.margin - parseInt(style.marginLeft);
            var gap = window.innerWidth / 5;

            _change.apply(this, [Math.abs(diff) < (Number(gap < 100) * gap || 100) ? 0 : diff / -Math.abs(diff)]);
        }, this));

        // Добавление недостающих элементов нафигации и управления
        this.$overlay.find('.popup-close').length || this.$overlay.append('<span class="popup-close" />');
        this.$loader = $(this.$overlay.find('.popup-loader').get(0) || '<span class="popup-loader" />').appendTo(this.$overlay);

        $.each(['next', 'prev'], $.proxy(function(i, elem) {
            ($(this.$overlay.find('.popup-nav-' + elem).get(0) || '<span class="popup-nav-' + elem + '" />').appendTo(this.$overlay)).on('click', $.proxy(function(i, e) {
                e.preventDefault();
                _change.apply(this, [i || -1]);
            }, this, i));
        }, this));

        // Фикс для тачскринов
        !('ontouchend' in document) || this.$overlay.find('.popup-nav-prev, .popup-nav-next').addClass('popup-nohover');
    };

    $.gallery.prototype = Object.create($.popup.prototype);
    $.gallery.prototype.constructor = $.popup;

    /** Параметры по умолчанию */ 
    $.gallery.prototype.defaultOptions = {
        images: '',
        error: function(src) {},
        transition: 700
    };

    $.gallery.prototype.$loader;
    $.gallery.prototype._$image;
    $.gallery.prototype._preview;
    $.gallery.prototype._timeout;

    /** 
     * Настройка копии плагина
     * @param Object options
     * @return $.gallery
     */ 
    $.gallery.prototype.config = function(options) {

        options = $.extend({}, options);

        // Выключение обработки кликов по превью
        if (this.options.images && this.options.images instanceof String) {
            $(document).off('click', this.options.images, $.proxy(_preview, this));
        }

        // Расширение пользовательского обработчика open
        options.open = $.proxy(function(open) {
            $('body').on('touchstart', _noscroll);
            _call.apply(this, [open]);
        }, this.$popup.get(0), options.open);

        // Расширение пользовательского обработчика close
        options.close = $.proxy(function(close) {
            this._$image.off('load error');
            this.$overlay.find('.popup-nav-next, .popup-nav-prev').removeClass('popup-show');
            if (this.$popup.hasClass('effect-slide')) this.$popup.removeClass('effect-slide-left effect-slide-right');
            $('body').off('touchstart', _noscroll);
            _call.apply(this.$popup.get(0), [close]);
        }, this, options.close);

        // Расширение пользовательского обработчика realign
        options.realign = $.proxy(function(realign) {
            _clean_style.call(this);
            _call.apply(this, [realign]);
        }, this.$popup.get(0), options.realign);

        // Принудительное включение модального режимаа
        options.modal = true;

        // Вызов родительского метода config
        this.constructor.prototype.config.apply(this, [options]);

        // Включение обработки кликов по превью
        if (this.options.images && !(this.options.images instanceof Array)) {
            this.options.images = String(this.options.images);
            $(document).on('click', this.options.images, $.proxy(_preview, this));
        }

        return this;
    };

    /** 
     * Открывает изображение image
     * @param mixed image
     * @return $.gallery
     */ 
    $.gallery.prototype.open = function(image) {
        if (image === void 0) {
            image = this.options.images instanceof Array
                ? this.options.images[0]
                : $(this.options.images).eq(0)
            ;
        }
        _navigate_to.apply(this, [image]);
        _open.apply(this);
        return this;
    };

    /** 
     * Уничтодение копии плагина с отменой обработки событий 
     * @return jQuery
     */ 
    $.gallery.prototype.destroy = function() {
        this.config({});
        this.constructor.prototype.destroy.call(this);
        this.$popup.off('touchstart touchmove touchend');
        this.$overlay.find('.popup-nav-prev, .popup-nav-next').off('click');
        return this.$popup;
    };

    /** Регистрация плагина jQuery */ 
    $.fn.gallery = function(options) {
        return this.each(function(i, elem) {
            (new $.gallery(elem, options === void 0 ? {} : options));
        });
    };

})(jQuery);