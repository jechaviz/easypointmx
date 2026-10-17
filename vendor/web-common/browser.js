(function (global) {
  "use strict";

  var DANGEROUS_KEYS = { __proto__: true, prototype: true, constructor: true };
  var SECRET_KEY =
    /(?:password|passphrase|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|bearer|private[_-]?key|certificate|csd(?:Key|Cert|Password)|pac(?:ApiKey|Password|User))/i;
  // A deliberately conservative ceiling for client-side demo values. Server-side
  // policy remains authoritative in a production integration.
  var MAX_FINANCIAL_AMOUNT = 1000000000;

  function safeJsonParse(raw, fallback) {
    if (typeof raw !== "string" || !raw)
      return fallback == null ? null : fallback;
    try {
      return JSON.parse(raw, function (key, value) {
        return DANGEROUS_KEYS[key] ? undefined : value;
      });
    } catch (error) {
      return fallback == null ? null : fallback;
    }
  }

  function storageJson(value) {
    return JSON.stringify(value, function (key, current) {
      if (DANGEROUS_KEYS[key] || SECRET_KEY.test(key)) return undefined;
      return current;
    });
  }

  function sanitizeText(value, maxLength) {
    var limit = Math.max(1, Number(maxLength) || 4000);
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
      .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gi, "")
      .normalize("NFKC")
      .slice(0, limit);
  }

  function isSafeAmount(value, minimum, maximum) {
    var amount = Number(value);
    var min = Number.isFinite(Number(minimum)) ? Number(minimum) : 0;
    var max = Number.isFinite(Number(maximum))
      ? Number(maximum)
      : MAX_FINANCIAL_AMOUNT;
    return Number.isFinite(amount) && amount >= min && amount <= max;
  }

  function safeInternalPath(value, fallback) {
    var path = sanitizeText(value, 500).trim();
    if (!/^\/(?![\\/])/.test(path) || /[\u0000-\u001f\\]/.test(path))
      return fallback || "/dashboard";
    return path;
  }

  function mergeRouteQuery(current, patch) {
    var next = {};
    Object.keys(current || {}).forEach(function (key) {
      if (DANGEROUS_KEYS[key]) return;
      var value = current[key];
      if (Array.isArray(value)) {
        next[key] = value
          .map(function (item) {
            return sanitizeText(item, 240);
          })
          .slice(0, 30);
      } else if (value != null && value !== "") {
        next[key] = sanitizeText(value, 240);
      }
    });
    Object.keys(patch || {}).forEach(function (key) {
      if (DANGEROUS_KEYS[key]) return;
      var value = patch[key];
      if (value == null || value === "" || value === false) delete next[key];
      else next[key] = sanitizeText(value, 240);
    });
    return next;
  }
  function createContentRepository(locales, fallbackLocale) {
    return {
      fallbackLocale: fallbackLocale,
      hasLocale: function (code) {
        return Boolean(locales[code]);
      },
      listLocales: function () {
        return Object.keys(locales).map(function (code) {
          return Object.assign({ code: code }, locales[code].localeMeta);
        });
      },
      get: function (code) {
        return locales[code] || locales[fallbackLocale];
      },
    };
  }

  // Runtime i18n for CDN/SFC applications. It keeps application copy in a
  // dedicated catalogue while this shared layer owns locale persistence,
  // safe text/attribute updates and translation of asynchronously mounted UI.
  function createRuntimeI18n(options) {
    var settings = options || {};
    var sourceLocale = settings.sourceLocale || "en";
    var supported = Array.isArray(settings.supported)
      ? settings.supported.slice(0, 12)
      : [sourceLocale];
    var storage = createSafeStorage(settings.storageKey || "web-locale");
    var messages = settings.messages || {};
    var patterns = Array.isArray(settings.patterns) ? settings.patterns : [];
    var preferred = sanitizeText(storage.read(), 12).toLowerCase();
    var browserLocale = sanitizeText(
      global.navigator && global.navigator.language,
      12,
    )
      .toLowerCase()
      .split("-")[0];
    var locale = supported.includes(preferred)
      ? preferred
      : supported.includes(browserLocale)
        ? browserLocale
        : sourceLocale;
    var listeners = [];
    var observer = null;
    var textState = new WeakMap();
    var attributeState = new WeakMap();
    var attributes = ["aria-label", "placeholder", "title", "alt"];

    function interpolate(value, params) {
      return String(value).replace(/\{(\w+)\}/g, function (match, key) {
        return params && params[key] != null ? String(params[key]) : match;
      });
    }

    function translate(value, params, targetLocale) {
      var target = targetLocale || locale;
      var source = String(value == null ? "" : value);
      if (target === sourceLocale) return interpolate(source, params);
      var catalogue = messages[target] || {};
      var translated = Object.prototype.hasOwnProperty.call(catalogue, source)
        ? catalogue[source]
        : null;
      if (translated == null) {
        for (var index = 0; index < patterns.length; index += 1) {
          var rule = patterns[index];
          if (!rule || !rule.match || typeof rule.replace !== "function")
            continue;
          rule.match.lastIndex = 0;
          if (rule.match.test(source)) {
            rule.match.lastIndex = 0;
            translated = source.replace(rule.match, rule.replace);
            break;
          }
        }
      }
      return interpolate(translated == null ? source : translated, params);
    }

    function translateTextNode(node) {
      if (!node || node.nodeType !== 3 || !node.parentElement) return;
      if (node.parentElement.closest("script,style,code,pre,[data-no-i18n]"))
        return;
      var current = node.nodeValue || "";
      var state = textState.get(node);
      if (!state || current !== state.rendered) {
        var match = current.match(/^(\s*)([\s\S]*?)(\s*)$/);
        state = {
          leading: match ? match[1] : "",
          source: match ? match[2] : current,
          trailing: match ? match[3] : "",
          rendered: current,
        };
      }
      if (!state.source) {
        textState.set(node, state);
        return;
      }
      var next =
        state.leading + translate(state.source) + state.trailing;
      state.rendered = next;
      textState.set(node, state);
      if (current !== next) node.nodeValue = next;
    }

    function translateElementAttributes(element) {
      if (!element || element.nodeType !== 1) return;
      var state = attributeState.get(element) || {};
      attributes.forEach(function (name) {
        if (!element.hasAttribute(name)) return;
        var current = element.getAttribute(name) || "";
        var entry = state[name];
        if (!entry || current !== entry.rendered)
          entry = { source: current, rendered: current };
        var next = translate(entry.source);
        entry.rendered = next;
        state[name] = entry;
        if (current !== next) element.setAttribute(name, next);
      });
      attributeState.set(element, state);
    }

    function translateTree(root) {
      if (!root) return;
      if (root.nodeType === 3) {
        translateTextNode(root);
        return;
      }
      if (root.nodeType !== 1 && root.nodeType !== 9) return;
      if (root.nodeType === 1) translateElementAttributes(root);
      var walker = global.document.createTreeWalker(
        root,
        global.NodeFilter.SHOW_ELEMENT | global.NodeFilter.SHOW_TEXT,
      );
      var node;
      while ((node = walker.nextNode())) {
        if (node.nodeType === 3) translateTextNode(node);
        else translateElementAttributes(node);
      }
    }

    function setLocale(next) {
      var clean = sanitizeText(next, 12).toLowerCase().split("-")[0];
      if (!supported.includes(clean)) return false;
      locale = clean;
      storage.write(clean);
      if (global.document) {
        global.document.documentElement.lang = clean;
        translateTree(global.document.body);
      }
      listeners.slice().forEach(function (listener) {
        listener(clean);
      });
      if (global.dispatchEvent)
        global.dispatchEvent(
          new CustomEvent("web-common:locale", { detail: { locale: clean } }),
        );
      return true;
    }

    function install(root) {
      if (!global.document || !global.MutationObserver) return function () {};
      var scope = root || global.document.body;
      global.document.documentElement.lang = locale;
      translateTree(scope);
      if (observer) observer.disconnect();
      observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.type === "characterData")
            translateTextNode(mutation.target);
          else if (mutation.type === "attributes")
            translateElementAttributes(mutation.target);
          else
            Array.prototype.forEach.call(mutation.addedNodes, translateTree);
        });
      });
      observer.observe(scope, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: attributes,
      });
      return function () {
        if (observer) observer.disconnect();
        observer = null;
      };
    }

    return {
      getLocale: function () {
        return locale;
      },
      intlLocale: function () {
        return locale === "es" ? "es-MX" : "en-US";
      },
      setLocale: setLocale,
      t: translate,
      install: install,
      subscribe: function (listener) {
        if (typeof listener !== "function") return function () {};
        listeners.push(listener);
        return function () {
          listeners = listeners.filter(function (item) {
            return item !== listener;
          });
        };
      },
      supported: supported.slice(),
    };
  }

  function createSafeStorage(key) {
    return {
      read: function () {
        try {
          return global.localStorage.getItem(key);
        } catch (error) {
          return null;
        }
      },
      write: function (value) {
        try {
          global.localStorage.setItem(key, value);
        } catch (error) {
          return false;
        }
        return true;
      },
    };
  }

  // Persiste JSON con una versión de esquema y conserva el valor legado para que
  // cada app pueda decidir cómo migrarlo. Evita que un cambio de datos rompa demos
  // ya abiertas en el navegador.
  function createVersionedStorage(key, version) {
    var storage = createSafeStorage(key);
    return {
      read: function () {
        var raw = storage.read();
        if (!raw) return { value: null, legacy: false };
        var parsed = safeJsonParse(raw, null);
        if (
          parsed &&
          parsed.version === version &&
          Object.prototype.hasOwnProperty.call(parsed, "data")
        ) {
          return {
            value: parsed.data,
            legacy: false,
            savedAt: parsed.savedAt || null,
          };
        }
        return parsed
          ? { value: parsed, legacy: true, savedAt: null }
          : { value: null, legacy: false };
      },
      write: function (value) {
        try {
          var serialized = storageJson({
            version: version,
            savedAt: new Date().toISOString(),
            data: value,
          });
          if (serialized.length > 4 * 1024 * 1024) return false;
          return storage.write(serialized);
        } catch (error) {
          return false;
        }
      },
      clear: function () {
        try {
          global.localStorage.removeItem(key);
          return true;
        } catch (error) {
          return false;
        }
      },
    };
  }

  // Borradores efimeros: sobreviven a un refresh en la misma pestaña, expiran
  // automaticamente y nunca serializan campos que parezcan secretos.
  function createSessionDraft(key, options) {
    var settings = options || {};
    var ttl = Math.max(60000, Number(settings.ttlMs) || 8 * 60 * 60 * 1000);
    var maxBytes = Math.max(1024, Number(settings.maxBytes) || 512 * 1024);
    var storage;
    try {
      storage = global.sessionStorage;
    } catch (error) {
      storage = null;
    }
    return {
      read: function () {
        if (!storage) return null;
        try {
          var parsed = safeJsonParse(storage.getItem(key), null);
          var saved = parsed && new Date(parsed.savedAt).getTime();
          if (!parsed || !Number.isFinite(saved) || Date.now() - saved > ttl) {
            storage.removeItem(key);
            return null;
          }
          return parsed.data == null ? null : parsed.data;
        } catch (error) {
          return null;
        }
      },
      write: function (value) {
        if (!storage) return false;
        try {
          var serialized = storageJson({
            savedAt: new Date().toISOString(),
            data: value,
          });
          if (serialized.length > maxBytes) return false;
          storage.setItem(key, serialized);
          return true;
        } catch (error) {
          return false;
        }
      },
      clear: function () {
        if (!storage) return false;
        try {
          storage.removeItem(key);
          return true;
        } catch (error) {
          return false;
        }
      },
    };
  }

  function syncDocumentMeta(locale, meta) {
    if (!global.document || !meta) return;
    global.document.documentElement.lang = locale;
    global.document.title = meta.title || global.document.title;

    var description = global.document.querySelector('meta[name="description"]');
    if (description && meta.description) {
      description.setAttribute("content", meta.description);
    }
  }

  function validationMessage(control) {
    var validity = control.validity;
    if (validity.valueMissing) return "This field is required.";
    if (validity.typeMismatch) return "Enter a value in the requested format.";
    if (validity.patternMismatch) return "Use the requested format.";
    if (validity.rangeUnderflow)
      return "The value must be at least " + control.min + ".";
    if (validity.rangeOverflow)
      return "The value must be no more than " + control.max + ".";
    if (validity.stepMismatch)
      return "Enter a value that matches the allowed increment.";
    if (validity.tooLong) return "Shorten this value.";
    return "Review this field.";
  }

  function installFormValidation(root) {
    var document = global.document;
    if (
      !document ||
      document.documentElement.dataset.formUxInstalled === "true"
    )
      return function () {};
    document.documentElement.dataset.formUxInstalled = "true";
    var scope = root || document;
    var counter = 0;

    function labelFor(control) {
      if (control.closest) {
        var nested = control.closest("label");
        if (nested) return nested;
      }
      return control.id
        ? document.querySelector(
            'label[for="' + global.CSS.escape(control.id) + '"]',
          )
        : null;
    }

    function decorate(control) {
      if (
        !control ||
        !control.matches ||
        !control.matches("input, select, textarea")
      )
        return;
      if (
        !control.hasAttribute("maxlength") &&
        (control.matches(
          'input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"]',
        ) ||
          control.tagName === "TEXTAREA")
      ) {
        control.maxLength = control.tagName === "TEXTAREA" ? 4000 : 240;
      }
      if (!control.required) return;
      control.setAttribute("aria-required", "true");
      var label = labelFor(control);
      if (!label) {
        if (!control.getAttribute("aria-label"))
          control.setAttribute(
            "aria-label",
            control.placeholder || control.name || "Required field",
          );
        return;
      }
      if (label.querySelector(".required-marker")) return;
      var marker = document.createElement("span");
      marker.className = "required-marker";
      marker.setAttribute("aria-hidden", "true");
      marker.title = "Required";
      marker.textContent = "*";
      var caption = Array.prototype.find.call(label.children, function (child) {
        return child.tagName === "SPAN" && !child.contains(control);
      });
      if (caption) caption.appendChild(marker);
      else if (control.parentNode === label)
        label.insertBefore(marker, control);
      else label.insertBefore(marker, label.firstChild);
    }

    function clearError(control) {
      control.classList.remove("is-invalid");
      control.removeAttribute("aria-invalid");
      var errorId = control.getAttribute("data-error-id");
      if (errorId) document.getElementById(errorId)?.remove();
      control.removeAttribute("data-error-id");
      control.removeAttribute("aria-describedby");
      if (control.value && control.checkValidity())
        control.classList.add("is-valid");
      else control.classList.remove("is-valid");
    }

    function showError(control) {
      decorate(control);
      control.form?.classList.add("was-validated");
      control.classList.remove("is-valid");
      control.classList.add("is-invalid");
      control.setAttribute("aria-invalid", "true");
      var id = control.getAttribute("data-error-id");
      var error = id ? document.getElementById(id) : null;
      if (!error) {
        id = "field-error-" + ++counter;
        error = document.createElement("span");
        error.id = id;
        error.className = "field-error";
        error.setAttribute("role", "alert");
        control.insertAdjacentElement("afterend", error);
        control.setAttribute("data-error-id", id);
        control.setAttribute("aria-describedby", id);
      }
      error.textContent = validationMessage(control);
    }

    function scan(node) {
      if (!node || node.nodeType !== 1) return;
      var forms = [];
      if (node.matches?.("form")) forms.push(node);
      node.querySelectorAll?.("form").forEach(function (form) {
        forms.push(form);
      });
      forms.forEach(function (form) {
        if (form.querySelector("[required]")) return;
        form
          .querySelectorAll(
            'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]), select, textarea',
          )
          .forEach(function (control) {
            if (!control.disabled && !control.hasAttribute("data-optional"))
              control.required = true;
          });
      });
      if (node.matches?.("input, select, textarea")) decorate(node);
      node.querySelectorAll?.("input, select, textarea").forEach(decorate);
    }

    scan(scope.documentElement || scope);
    var invalid = function (event) {
      showError(event.target);
    };
    var changed = function (event) {
      var control = event.target;
      if (!control.matches?.("input, select, textarea")) return;
      decorate(control);
      if (control.checkValidity()) clearError(control);
      else if (control.classList.contains("is-invalid")) showError(control);
    };
    var submitted = function (event) {
      var form = event.target;
      if (!form.matches?.("form")) return;
      form.classList.add("was-validated");
      var firstInvalid = form.querySelector(":invalid");
      if (firstInvalid) {
        event.preventDefault();
        showError(firstInvalid);
        firstInvalid.focus({ preventScroll: true });
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    document.addEventListener("invalid", invalid, true);
    document.addEventListener("input", changed, true);
    document.addEventListener("change", changed, true);
    document.addEventListener("submit", submitted, true);
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(scan);
      });
    });
    observer.observe(scope.documentElement || scope, {
      childList: true,
      subtree: true,
    });
    return function () {
      observer.disconnect();
      document.removeEventListener("invalid", invalid, true);
      document.removeEventListener("input", changed, true);
      document.removeEventListener("change", changed, true);
      document.removeEventListener("submit", submitted, true);
      delete document.documentElement.dataset.formUxInstalled;
    };
  }

  global.WebCommon = Object.freeze({
    createContentRepository: createContentRepository,
    createRuntimeI18n: createRuntimeI18n,
    createSafeStorage: createSafeStorage,
    createVersionedStorage: createVersionedStorage,
    createSessionDraft: createSessionDraft,
    safeJsonParse: safeJsonParse,
    storageJson: storageJson,
    sanitizeText: sanitizeText,
    MAX_FINANCIAL_AMOUNT: MAX_FINANCIAL_AMOUNT,
    isSafeAmount: isSafeAmount,
    safeInternalPath: safeInternalPath,
    mergeRouteQuery: mergeRouteQuery,
    installFormValidation: installFormValidation,
    syncDocumentMeta: syncDocumentMeta,
  });
})(window);
