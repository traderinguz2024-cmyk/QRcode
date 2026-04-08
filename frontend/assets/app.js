(function () {
    var root = null;
    var language = "uz";
    var pageRunId = 0;
    var navigationBound = false;
    var LANGUAGE_CODES = ["uz", "ru", "en"];
    var APP_CONFIG = window.QR_APP_CONFIG || {};
    var APP_BOOTSTRAP = window.QR_APP_BOOTSTRAP || {};
    var FRONTEND_ORIGIN = normalizeBaseUrl(APP_CONFIG.frontendUrl || window.location.origin);
    var BACKEND_ORIGIN = normalizeBaseUrl(APP_CONFIG.backendUrl || "https://qr.akadmvd.uz");
    var bootstrapPromise = null;
    var lookupBundleCache = Object.create(null);
    var lookupBundleRequests = Object.create(null);
    var jsonResponseCache = new Map();
    var jsonResponseRequestCache = new Map();
    var ttsAudioBlobCache = new Map();
    var ttsAudioRequestCache = new Map();
    var speechPlaybackId = 0;
    var speechVoicesPromise = null;

    var TRANSLATIONS = {
        uz: {
            listError: "Obyektlarni yuklashda xatolik yuz berdi.",
            lookupError: "Filtr ma'lumotlarini yuklab bo'lmadi.",
            noCategory: "Kategoriya yo'q",
            noFaculty: "Fakultet yo'q",
            noTeacher: "O'qituvchi biriktirilmagan",
            facultyLabel: "Fakultet",
            teacherLabel: "O'qituvchi ismi",
            noDescription: "Bu obyekt uchun hozircha tavsif kiritilmagan.",
            createdTime: "Yaratilgan vaqt",
            qrReady: "Tayyor",
            qrPending: "Kutilmoqda",
            view: "Ko'rish",
            edit: "Tahrirlash",
            noItems: "Filtrga mos obyekt topilmadi",
            listHeadObject: "Obyekt",
            listHeadDetails: "Ma'lumot",
            listHeadActions: "Harakat",
            emptyStateLabel: "Bo'sh holat",
            emptyBody: "Yangi obyekt qo'shing yoki tanlangan filtrlarni tozalab, umumiy ro'yxatga qayting.",
            addObject: "Qo'shish",
            backToList: "Ro'yxatga qaytish",
            detailTitle: "QR Tafsilot",
            detailError: "Obyekt ma'lumotlarini yuklab bo'lmadi.",
            shortDescriptionMissing: "Bu obyekt uchun qisqa tavsif mavjud emas.",
            notAssigned: "Biriktirilmagan",
            noStory: "Bu obyekt uchun hozircha tavsif kiritilmagan.",
            downloadAudio: "Audio faylni yuklash",
            downloadVideo: "Video faylni yuklash",
            noAudio: "Audio fayl biriktirilmagan.",
            noVideo: "Video fayl biriktirilmagan.",
            formLoadError: "Forma ma'lumotlarini yuklab bo'lmadi.",
            saveError: "Saqlashda xatolik yuz berdi.",
            deleteError: "O'chirishda xatolik yuz berdi.",
            deleteQuestion: "{name} yozuvini o'chirmoqchimisiz?",
            saveSuccess: "Saqlandi.",
            coverMissing: "Muqova rasmi yo'q",
            qrMissing: "QR hali yaratilmagan",
            ttsPlaying: "Tavsif avtomatik ovozda o'qilmoqda.",
            ttsUnsupported: "Brauzerda avtomatik ovozli o'qish mavjud emas."
        },
        ru: {
            listError: "Не удалось загрузить объекты.",
            lookupError: "Не удалось загрузить данные для фильтров.",
            noCategory: "Категория не указана",
            noFaculty: "Факультет не указан",
            noTeacher: "Преподаватель не назначен",
            facultyLabel: "Факультет",
            teacherLabel: "Имя преподавателя",
            noDescription: "Описание для этого объекта пока не добавлено.",
            createdTime: "Время создания",
            qrReady: "Готов",
            qrPending: "Ожидается",
            view: "Открыть",
            edit: "Редактировать",
            noItems: "По текущему фильтру объекты не найдены",
            listHeadObject: "Объект",
            listHeadDetails: "Сведения",
            listHeadActions: "Действия",
            emptyStateLabel: "Пустое состояние",
            emptyBody: "Добавьте новый объект или очистите выбранные фильтры, чтобы вернуться к полному списку.",
            addObject: "Добавить",
            backToList: "Вернуться к списку",
            detailTitle: "Детали QR",
            detailError: "Не удалось загрузить данные объекта.",
            shortDescriptionMissing: "Краткое описание для этого объекта пока отсутствует.",
            notAssigned: "Не указано",
            noStory: "Описание для этого объекта пока не добавлено.",
            downloadAudio: "Скачать аудио",
            downloadVideo: "Скачать видео",
            noAudio: "Аудиофайл не прикреплен.",
            noVideo: "Видеофайл не прикреплен.",
            formLoadError: "Не удалось загрузить данные формы.",
            saveError: "Не удалось сохранить изменения.",
            deleteError: "Не удалось удалить объект.",
            deleteQuestion: "Удалить запись {name}?",
            saveSuccess: "Сохранено.",
            coverMissing: "Обложка отсутствует",
            qrMissing: "QR еще не создан",
            ttsPlaying: "Описание автоматически озвучивается.",
            ttsUnsupported: "В этом браузере нет автоматического озвучивания."
        },
        en: {
            listError: "Unable to load objects.",
            lookupError: "Unable to load filter data.",
            noCategory: "No category",
            noFaculty: "No faculty",
            noTeacher: "Teacher not assigned",
            facultyLabel: "Faculty",
            teacherLabel: "Teacher name",
            noDescription: "No description has been added for this object yet.",
            createdTime: "Created time",
            qrReady: "Ready",
            qrPending: "Pending",
            view: "View",
            edit: "Edit",
            noItems: "No objects matched the current filter",
            listHeadObject: "Object",
            listHeadDetails: "Details",
            listHeadActions: "Actions",
            emptyStateLabel: "Empty state",
            emptyBody: "Add a new object or clear the selected filters to return to the full list.",
            addObject: "Add",
            backToList: "Back to list",
            detailTitle: "QR Detail",
            detailError: "Unable to load object details.",
            shortDescriptionMissing: "A short description has not been added for this object yet.",
            notAssigned: "Not assigned",
            noStory: "No description has been added for this object yet.",
            downloadAudio: "Download audio",
            downloadVideo: "Download video",
            noAudio: "No audio file is attached.",
            noVideo: "No video file is attached.",
            formLoadError: "Unable to load form data.",
            saveError: "Unable to save changes.",
            deleteError: "Unable to delete the object.",
            deleteQuestion: "Delete the {name} entry?",
            saveSuccess: "Saved.",
            coverMissing: "No cover image",
            qrMissing: "QR has not been generated yet",
            ttsPlaying: "The description is being read automatically.",
            ttsUnsupported: "Automatic speech is not available in this browser."
        }
    };

    var AUDIO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 16 0" /><rect x="2.5" y="12" width="4" height="7" rx="2" /><rect x="17.5" y="12" width="4" height="7" rx="2" /><path d="M6.5 19a2 2 0 0 0 2 2h7" /></svg>';
    var VIDEO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="m10 9 5 3-5 3z" /></svg>';
    var QR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" /><rect x="15" y="3" width="6" height="6" /><rect x="3" y="15" width="6" height="6" /><path d="M15 15h2v2h-2z" fill="currentColor" stroke="none" /><path d="M19 15h2v6h-6v-2h4z" fill="currentColor" stroke="none" /><path d="M15 19h2v2h-2z" fill="currentColor" stroke="none" /></svg>';

    function normalizeBaseUrl(value) {
        return String(value || "").replace(/\/+$/, "");
    }

    function frontendUrl(path) {
        return new URL(path, FRONTEND_ORIGIN + "/").toString();
    }

    function backendUrl(path) {
        return new URL(path, BACKEND_ORIGIN + "/").toString();
    }

    function applyAppConfig(pageRoot) {
        pageRoot.dataset.apiProducts = backendUrl("/api/products/");
        pageRoot.dataset.apiCategories = backendUrl("/api/categories/");
        pageRoot.dataset.apiFaculties = backendUrl("/api/faculties/");
        pageRoot.dataset.apiTeachers = backendUrl("/api/teachers/");
        pageRoot.dataset.apiTts = backendUrl("/api/tts/");
        pageRoot.dataset.indexUrl = frontendUrl("/");
        pageRoot.dataset.addUrl = frontendUrl("/add/");
        pageRoot.dataset.detailPattern = frontendUrl("/detail/999999/");
        pageRoot.dataset.editPattern = frontendUrl("/edit/999999/");
        pageRoot.dataset.deletePattern = frontendUrl("/delete/999999/");
        pageRoot.dataset.styleList = frontendUrl("/assets/object_list.css");
        pageRoot.dataset.styleDetail = frontendUrl("/assets/items_detail.css");
        pageRoot.dataset.styleForm = frontendUrl("/assets/item_form.css");
    }

    function syncRoot() {
        root = document.querySelector("[data-spa-root]");
        if (!root) {
            return null;
        }
        applyAppConfig(root);
        language = normalizeLanguage((routeFromUrl(window.location.href) || {}).lang || APP_CONFIG.defaultLanguage || document.documentElement.lang || "uz");
        root.dataset.lang = language;
        document.documentElement.lang = language;
        return root;
    }

    function normalizeLanguage(value) {
        return LANGUAGE_CODES.indexOf(value) === -1 ? "uz" : value;
    }

    function cloneLookupItems(items) {
        return Array.isArray(items) ? items.slice() : [];
    }

    function cacheLookupBundle(langCode, bundle) {
        var currentLanguage = normalizeLanguage(langCode || language);
        lookupBundleCache[currentLanguage] = {
            categories: cloneLookupItems(bundle && bundle.categories),
            faculties: cloneLookupItems(bundle && bundle.faculties),
            teachers: cloneLookupItems(bundle && bundle.teachers)
        };
        return lookupBundleCache[currentLanguage];
    }

    function getLookupBundle(langCode) {
        var currentLanguage = normalizeLanguage(langCode || language);
        if (lookupBundleCache[currentLanguage]) {
            return Promise.resolve(lookupBundleCache[currentLanguage]);
        }
        if (lookupBundleRequests[currentLanguage]) {
            return lookupBundleRequests[currentLanguage];
        }

        lookupBundleRequests[currentLanguage] = Promise.all([
            request(buildUrl(backendUrl("/api/categories/"), { lang: currentLanguage })),
            request(buildUrl(backendUrl("/api/faculties/"), { lang: currentLanguage })),
            request(buildUrl(backendUrl("/api/teachers/"), { lang: currentLanguage }))
        ]).then(function (results) {
            return cacheLookupBundle(currentLanguage, {
                categories: results[0],
                faculties: results[1],
                teachers: results[2]
            });
        }).finally(function () {
            delete lookupBundleRequests[currentLanguage];
        });

        return lookupBundleRequests[currentLanguage];
    }

    if (APP_BOOTSTRAP.lookups) {
        cacheLookupBundle(APP_BOOTSTRAP.lookups.language, APP_BOOTSTRAP.lookups);
    }

    function t(key, tokens, langCode) {
        var currentLanguage = normalizeLanguage(langCode || language);
        var value = (TRANSLATIONS[currentLanguage] && TRANSLATIONS[currentLanguage][key]) || TRANSLATIONS.uz[key] || key;
        if (!tokens) {
            return value;
        }
        return Object.keys(tokens).reduce(function (result, token) {
            return result.replace("{" + token + "}", tokens[token]);
        }, value);
    }

    function choose(langCode, values) {
        var currentLanguage = normalizeLanguage(langCode || language);
        return values[currentLanguage] || values.uz || values.en || "";
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function localizeMultilingualValue(value, langCode) {
        var currentLanguage = normalizeLanguage(langCode || language);
        if (!value) {
            return "";
        }
        if (typeof value === "string") {
            return value;
        }
        return value[currentLanguage] || value.uz || value.ru || value.en || "";
    }

    function localizeAssetValue(value, langCode) {
        var currentLanguage = normalizeLanguage(langCode || language);
        if (!value) {
            return "";
        }
        if (typeof value === "string") {
            return value;
        }
        return value[currentLanguage] || value.uz || value.ru || value.en || "";
    }

    function formatDate(dateString, options, langCode) {
        var currentLanguage = normalizeLanguage(langCode || language);
        if (!dateString) {
            return "";
        }
        try {
            return new Intl.DateTimeFormat(currentLanguage, options).format(new Date(dateString));
        } catch (error) {
            return dateString;
        }
    }

    function formatDateTime(dateString, langCode) {
        return formatDate(dateString, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }, langCode);
    }

    function resolveUrl(url) {
        if (!url) {
            return "";
        }
        return new URL(url, BACKEND_ORIGIN + "/").toString();
    }

    function supportsSpeechPlayback() {
        return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance !== "undefined";
    }

    function normalizeSpeechText(text) {
        return String(text || "").replace(/\s+/g, " ").trim();
    }

    function getSpeechLocale(langCode) {
        var currentLanguage = normalizeLanguage(langCode || language);
        if (currentLanguage === "ru") {
            return "ru-RU";
        }
        if (currentLanguage === "en") {
            return "en-US";
        }
        return "uz-UZ";
    }

    function loadSpeechVoices() {
        if (!supportsSpeechPlayback()) {
            return Promise.resolve([]);
        }
        if (speechVoicesPromise) {
            return speechVoicesPromise;
        }

        speechVoicesPromise = new Promise(function (resolve) {
            var synth = window.speechSynthesis;
            var resolved = false;

            function finish() {
                if (resolved) {
                    return;
                }
                resolved = true;
                synth.removeEventListener("voiceschanged", finish);
                resolve(synth.getVoices() || []);
            }

            var initialVoices = synth.getVoices();
            if (initialVoices && initialVoices.length) {
                resolved = true;
                resolve(initialVoices);
                return;
            }

            synth.addEventListener("voiceschanged", finish);
            window.setTimeout(finish, 600);
        });

        return speechVoicesPromise;
    }

    function pickSpeechVoice(voices, locale) {
        var localePrefix = locale.split("-")[0].toLowerCase();
        return (voices || []).slice().sort(function (left, right) {
            function score(voice) {
                var voiceLang = String(voice.lang || "").toLowerCase();
                var voiceName = String(voice.name || "").toLowerCase();
                var currentScore = 0;
                if (voiceLang === locale.toLowerCase()) {
                    currentScore += 8;
                } else if (voiceLang.indexOf(localePrefix) === 0) {
                    currentScore += 5;
                }
                if (voiceName.indexOf("google") !== -1) {
                    currentScore += 3;
                }
                if (voice.default) {
                    currentScore += 2;
                }
                if (voice.localService) {
                    currentScore += 1;
                }
                return currentScore;
            }

            return score(right) - score(left);
        })[0] || null;
    }

    function stopSpeechPlayback() {
        speechPlaybackId += 1;
        if (supportsSpeechPlayback()) {
            window.speechSynthesis.cancel();
        }
    }

    function startSpeechPlayback(text, langCode, callbacks) {
        var speechText = normalizeSpeechText(text);
        if (!speechText) {
            return Promise.resolve();
        }
        if (!supportsSpeechPlayback()) {
            return Promise.reject(new Error("speech-unavailable"));
        }

        stopSpeechPlayback();
        var playbackId = speechPlaybackId;
        var locale = getSpeechLocale(langCode);

        return loadSpeechVoices().then(function (voices) {
            return new Promise(function (resolve, reject) {
                var utterance = new window.SpeechSynthesisUtterance(speechText);
                var selectedVoice = pickSpeechVoice(voices, locale);

                utterance.lang = locale;
                utterance.rate = locale === "ru-RU" ? 0.96 : 1;
                utterance.pitch = 1;
                utterance.volume = 1;
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }

                utterance.onend = function () {
                    if (playbackId !== speechPlaybackId) {
                        return;
                    }
                    if (callbacks && typeof callbacks.onend === "function") {
                        callbacks.onend();
                    }
                    resolve();
                };

                utterance.onerror = function (event) {
                    if (playbackId !== speechPlaybackId) {
                        return;
                    }
                    if (callbacks && typeof callbacks.onerror === "function") {
                        callbacks.onerror(event);
                    }
                    reject(new Error((event && event.error) || "speech-error"));
                };

                window.speechSynthesis.speak(utterance);
            });
        });
    }

    function buildUrl(path, params) {
        var url = new URL(path, window.location.origin);
        Object.keys(params || {}).forEach(function (key) {
            var value = params[key];
            if (value === null || value === undefined || value === "") {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        });
        return url.toString();
    }

    function buildPatternUrl(pattern, id, params) {
        return buildUrl(String(pattern || "").replace("999999", String(id)), params);
    }

    function buildApiDetailUrl(basePath, id, params) {
        var normalized = String(basePath || "").replace(/\/?$/, "/");
        return buildUrl(normalized + String(id) + "/", params);
    }

    function cloneJsonPayload(payload) {
        if (payload == null) {
            return payload;
        }
        return JSON.parse(JSON.stringify(payload));
    }

    function buildJsonResponseCacheKey(url) {
        return new URL(url, window.location.origin).toString();
    }

    function rememberJsonResponse(cacheKey, payload) {
        if (!cacheKey) {
            return;
        }
        if (!jsonResponseCache.has(cacheKey) && jsonResponseCache.size >= 48) {
            var oldestKey = jsonResponseCache.keys().next().value;
            if (oldestKey) {
                jsonResponseCache.delete(oldestKey);
            }
        }
        jsonResponseCache.set(cacheKey, cloneJsonPayload(payload));
    }

    function clearDataCaches() {
        lookupBundleCache = Object.create(null);
        lookupBundleRequests = Object.create(null);
        jsonResponseCache.clear();
        jsonResponseRequestCache.clear();
    }

    function buildIndexUrl(langCode, categoryId, facultyId) {
        return buildUrl(root.dataset.indexUrl, {
            lang: normalizeLanguage(langCode || language),
            category: categoryId || "",
            faculty: facultyId || ""
        });
    }

    function buildAddUrl(langCode) {
        return buildUrl(root.dataset.addUrl, { lang: normalizeLanguage(langCode || language) });
    }

    function buildDetailUrl(id, langCode) {
        return buildPatternUrl(root.dataset.detailPattern, id, { lang: normalizeLanguage(langCode || language) });
    }

    function buildEditUrl(id, langCode) {
        return buildPatternUrl(root.dataset.editPattern, id, { lang: normalizeLanguage(langCode || language) });
    }

    function buildDeleteUrl(id, langCode) {
        return buildPatternUrl(root.dataset.deletePattern, id, { lang: normalizeLanguage(langCode || language) });
    }

    function normalizePath(pathname) {
        var normalized = String(pathname || "/").replace(/\/+$/, "");
        return normalized ? normalized + "/" : "/";
    }

    function routeFromUrl(urlLike) {
        var url = new URL(urlLike, window.location.origin);
        var langCode = normalizeLanguage(url.searchParams.get("lang"));
        var pathname = normalizePath(url.pathname);
        var match = null;

        if (pathname === "/") {
            return { page: "list", lang: langCode, category: url.searchParams.get("category") || "", faculty: url.searchParams.get("faculty") || "", url: url };
        }
        if (pathname === "/add/") {
            return { page: "form", mode: "create", lang: langCode, url: url };
        }
        match = pathname.match(/^\/detail\/(\d+)\/$/);
        if (match) {
            return { page: "detail", productId: match[1], lang: langCode, url: url };
        }
        match = pathname.match(/^\/edit\/(\d+)\/$/);
        if (match) {
            return { page: "form", mode: "edit", productId: match[1], lang: langCode, url: url };
        }
        match = pathname.match(/^\/delete\/(\d+)\/$/);
        if (match) {
            return { page: "delete", productId: match[1], lang: langCode, url: url };
        }
        return null;
    }

    function buildRouteUrl(route, langCode) {
        var nextLanguage = normalizeLanguage(langCode || (route && route.lang) || language);
        if (!route) {
            return buildIndexUrl(nextLanguage);
        }
        if (route.page === "detail") {
            return buildDetailUrl(route.productId, nextLanguage);
        }
        if (route.page === "form" && route.mode === "create") {
            return buildAddUrl(nextLanguage);
        }
        if (route.page === "form" && route.mode === "edit") {
            return buildEditUrl(route.productId, nextLanguage);
        }
        if (route.page === "delete") {
            return buildDeleteUrl(route.productId, nextLanguage);
        }
        return buildIndexUrl(nextLanguage, route.category, route.faculty);
    }

    function getPageTitle(route) {
        if (!route) {
            return choose(language, { uz: "QR katalog", ru: "QR каталог", en: "QR Catalog" });
        }
        if (route.page === "detail") {
            return choose(route.lang, { uz: "QR Tafsilot", ru: "Детали QR", en: "QR Detail" });
        }
        if (route.page === "form" && route.mode === "create") {
            return choose(route.lang, { uz: "Yangi Obyekt", ru: "Новый объект", en: "New Object" });
        }
        if (route.page === "form" && route.mode === "edit") {
            return choose(route.lang, { uz: "Obyektni Tahrirlash", ru: "Редактирование объекта", en: "Edit Object" });
        }
        if (route.page === "delete") {
            return choose(route.lang, { uz: "Obyektni O'chirish", ru: "Удаление объекта", en: "Delete Object" });
        }
        return choose(route.lang, { uz: "QR katalog", ru: "QR каталог", en: "QR Catalog" });
    }

    function getPageStyleHref(route) {
        if (route.page === "detail") {
            return root.dataset.styleDetail;
        }
        if (route.page === "form" || route.page === "delete") {
            return root.dataset.styleForm;
        }
        return root.dataset.styleList;
    }

    function updatePageStyle(route) {
        var link = document.querySelector("[data-spa-page-style]");
        if (!link) {
            return;
        }
        var nextHref = getPageStyleHref(route);
        if (nextHref && link.getAttribute("href") !== nextHref) {
            link.setAttribute("href", nextHref);
        }
    }

    function headerLanguageMenuMarkup(currentLanguage, linkBuilder) {
        var activeLanguage = normalizeLanguage(currentLanguage);
        var buildLink = typeof linkBuilder === "function"
            ? linkBuilder
            : function (langCode) {
                return buildRouteUrl(routeFromUrl(window.location.href), langCode);
            };

        return [
            '<details class="floating-language" data-floating-language>',
            '  <summary class="floating-language__summary">',
            '    <span class="floating-language__current">',
            '      <span class="floating-flag floating-flag--' + escapeHtml(activeLanguage) + '"></span>',
            '      <span class="floating-language__code">' + escapeHtml(activeLanguage.toUpperCase()) + "</span>",
            "    </span>",
            "  </summary>",
            '  <div class="floating-language__list">'
        ].concat(LANGUAGE_CODES.map(function (langCode) {
            var stateClass = langCode === activeLanguage ? " floating-language__item--active" : "";
            return [
                '    <a class="floating-language__item' + stateClass + '" href="' + escapeHtml(buildLink(langCode)) + '" data-global-language-link="' + escapeHtml(langCode) + '">',
                '      <span class="floating-language__item-main">',
                '        <span class="floating-flag floating-flag--' + escapeHtml(langCode) + '"></span>',
                '        <span class="floating-language__code">' + escapeHtml(langCode.toUpperCase()) + "</span>",
                "      </span>",
                "    </a>"
            ].join("");
        })).concat(["  </div>", "</details>"]).join("");
    }

    function renderHeaderLanguageMenu(container, currentLanguage, linkBuilder) {
        if (!container) {
            return;
        }
        container.innerHTML = headerLanguageMenuMarkup(currentLanguage, linkBuilder);
    }

    function getCookie(name) {
        var cookies = document.cookie ? document.cookie.split(";") : [];
        for (var index = 0; index < cookies.length; index += 1) {
            var cookie = cookies[index].trim();
            if (cookie.indexOf(name + "=") === 0) {
                return decodeURIComponent(cookie.slice(name.length + 1));
            }
        }
        return "";
    }

    function getCsrfToken() {
        var field = document.querySelector("input[name='csrfmiddlewaretoken']");
        return (field && field.value) || getCookie("csrftoken");
    }

    async function parseResponse(response) {
        if (response.status === 204) {
            return null;
        }
        var contentType = response.headers.get("content-type") || "";
        if (contentType.indexOf("application/json") !== -1) {
            return response.json();
        }
        return response.text();
    }

    function prepareRequestOptions(options) {
        var prepared = Object.assign({}, options || {});
        prepared.headers = Object.assign(
            {
                Accept: "application/json"
            },
            prepared.headers || {}
        );
        if (!prepared.credentials) {
            prepared.credentials = "include";
        }
        return prepared;
    }

    function flattenError(value) {
        if (!value) {
            return "";
        }
        if (typeof value === "string") {
            if (/^\s*</.test(value)) {
                return "";
            }
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(flattenError).filter(Boolean).join(" ");
        }
        if (typeof value === "object") {
            return Object.keys(value).map(function (key) {
                return key + ": " + flattenError(value[key]);
            }).join(" ");
        }
        return String(value);
    }

    async function ensureBootstrap() {
        if (bootstrapPromise) {
            return bootstrapPromise;
        }

        bootstrapPromise = (async function () {
            var response = await fetch(backendUrl("/api/bootstrap/"), prepareRequestOptions());
            var payload = await parseResponse(response);
            if (!response.ok) {
                var error = new Error(flattenError(payload) || response.statusText);
                error.payload = payload;
                throw error;
            }
            return payload;
        }()).catch(function (error) {
            bootstrapPromise = null;
            throw error;
        });

        return bootstrapPromise;
    }

    async function request(url, options) {
        var prepared = prepareRequestOptions(options);
        var method = String(prepared.method || "GET").toUpperCase();
        var shouldCache = method === "GET" && !prepared.body;
        var cacheKey = shouldCache ? buildJsonResponseCacheKey(url) : "";

        if (["POST", "PUT", "PATCH", "DELETE"].indexOf(method) !== -1) {
            if (!prepared.headers["X-CSRFToken"]) {
                prepared.headers["X-CSRFToken"] = getCsrfToken();
            }
            if (!prepared.headers["X-CSRFToken"]) {
                await ensureBootstrap();
                prepared.headers["X-CSRFToken"] = getCsrfToken();
            }
        }

        if (shouldCache) {
            if (jsonResponseCache.has(cacheKey)) {
                return cloneJsonPayload(jsonResponseCache.get(cacheKey));
            }
            if (jsonResponseRequestCache.has(cacheKey)) {
                return jsonResponseRequestCache.get(cacheKey).then(cloneJsonPayload);
            }
        }

        var requestPromise = fetch(url, prepared).then(async function (response) {
            var payload = await parseResponse(response);
            if (!response.ok) {
                var error = new Error(flattenError(payload) || response.statusText);
                error.payload = payload;
                throw error;
            }
            if (shouldCache) {
                rememberJsonResponse(cacheKey, payload);
            } else if (["POST", "PUT", "PATCH", "DELETE"].indexOf(method) !== -1) {
                clearDataCaches();
            }
            return payload;
        });

        if (shouldCache) {
            jsonResponseRequestCache.set(cacheKey, requestPromise);
            try {
                return cloneJsonPayload(await requestPromise);
            } finally {
                jsonResponseRequestCache.delete(cacheKey);
            }
        }

        return requestPromise;
    }

    async function requestBlob(url, options) {
        var prepared = prepareRequestOptions(options);
        var method = String(prepared.method || "GET").toUpperCase();

        if (["POST", "PUT", "PATCH", "DELETE"].indexOf(method) !== -1) {
            if (!prepared.headers["X-CSRFToken"]) {
                prepared.headers["X-CSRFToken"] = getCsrfToken();
            }
            if (!prepared.headers["X-CSRFToken"]) {
                await ensureBootstrap();
                prepared.headers["X-CSRFToken"] = getCsrfToken();
            }
        }

        var response = await fetch(url, prepared);
        if (!response.ok) {
            var contentType = response.headers.get("content-type") || "";
            var payload;
            if (contentType.indexOf("application/json") !== -1) {
                payload = await response.json();
            } else {
                payload = await response.text();
            }
            var error = new Error(flattenError(payload) || response.statusText);
            error.payload = payload;
            throw error;
        }
        return response.blob();
    }

    function buildTtsAudioCacheKey(identifier, langCode, text) {
        return [String(identifier || ""), normalizeLanguage(langCode || language), normalizeSpeechText(text)].join("::");
    }

    function rememberTtsAudioBlob(cacheKey, audioBlob) {
        if (!cacheKey || !audioBlob) {
            return;
        }
        if (!ttsAudioBlobCache.has(cacheKey) && ttsAudioBlobCache.size >= 24) {
            var oldestKey = ttsAudioBlobCache.keys().next().value;
            if (oldestKey) {
                ttsAudioBlobCache.delete(oldestKey);
            }
        }
        ttsAudioBlobCache.set(cacheKey, audioBlob);
    }

    function prefetchTtsAudio(ttsUrl, identifier, langCode, text) {
        var speechText = normalizeSpeechText(text);
        if (!ttsUrl || !speechText) {
            return Promise.resolve(null);
        }
        var cacheKey = buildTtsAudioCacheKey(identifier, langCode, speechText);
        if (ttsAudioBlobCache.has(cacheKey)) {
            return Promise.resolve(ttsAudioBlobCache.get(cacheKey));
        }
        if (ttsAudioRequestCache.has(cacheKey)) {
            return ttsAudioRequestCache.get(cacheKey);
        }
        var requestPromise = requestBlob(ttsUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: speechText,
                lang: normalizeLanguage(langCode || language)
            })
        }).then(function (audioBlob) {
            rememberTtsAudioBlob(cacheKey, audioBlob);
            return audioBlob;
        }).finally(function () {
            ttsAudioRequestCache.delete(cacheKey);
        });
        ttsAudioRequestCache.set(cacheKey, requestPromise);
        return requestPromise;
    }

    function showFeedback(element, message, variant) {
        if (!element) {
            return;
        }
        element.textContent = message;
        element.hidden = false;
        element.classList.remove("ui-feedback--error", "ui-feedback--success", "form-status--error", "form-status--success");
        if (variant) {
            element.classList.add((element.classList.contains("form-status") ? "form-status--" : "ui-feedback--") + variant);
        }
    }

    function hideFeedback(element) {
        if (!element) {
            return;
        }
        element.hidden = true;
        element.textContent = "";
        element.classList.remove("ui-feedback--error", "ui-feedback--success", "form-status--error", "form-status--success");
    }

    function populateSelect(select, items, selectedValue, langCode) {
        if (!select) {
            return;
        }
        var placeholder = select.dataset.placeholder;
        if (!placeholder) {
            var firstOption = select.querySelector("option");
            placeholder = firstOption ? firstOption.textContent.trim() : "";
            select.dataset.placeholder = placeholder;
        }
        select.innerHTML = "";
        var placeholderOption = document.createElement("option");
        placeholderOption.value = "";
        placeholderOption.textContent = placeholder;
        select.appendChild(placeholderOption);
        items.forEach(function (item) {
            var option = document.createElement("option");
            option.value = item.id;
            option.textContent = item.display_name || localizeMultilingualValue(item.name, langCode) || (typeof item.name === "string" ? item.name : "");
            if (String(selectedValue || "") === String(item.id)) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    function toggleButtonBusy(button, busy) {
        if (!button) {
            return;
        }
        button.classList.toggle("is-busy", busy);
        button.disabled = busy;
    }

    function setNavigationState(busy) {
        document.body.classList.toggle("is-navigating", busy);
    }

    function togglePageSkeleton(pageRoot, enabled) {
        if (!pageRoot) {
            return;
        }
        pageRoot.classList.toggle("is-skeleton-loading", !!enabled);
        if (enabled) {
            pageRoot.setAttribute("aria-busy", "true");
        } else {
            pageRoot.removeAttribute("aria-busy");
        }
    }

    function isActivePage(pageRoot, runId) {
        return !!pageRoot && pageRoot === root && pageRoot.isConnected && pageRunId === runId;
    }

    function brandMarkup(langCode) {
        return [
            '<a class="brand" href="' + escapeHtml(buildIndexUrl(langCode)) + '">',
            '    <span class="brand__mark">QR</span>',
            '    <span class="brand__text">' + escapeHtml(choose(langCode, {
                uz: "Akademik katalog",
                ru: "Академический каталог",
                en: "Academic catalog"
            })) + "</span>",
            "</a>"
        ].join("");
    }

    function addButtonMarkup(langCode) {
        return [
            '<a class="button button--primary button--add" href="' + escapeHtml(buildAddUrl(langCode)) + '">',
            '    <span class="button__icon" aria-hidden="true">+</span>',
            '    <span>' + escapeHtml(choose(langCode, {
                uz: "Qo'shish",
                ru: "Добавить",
                en: "Add"
            })) + "</span>",
            "</a>"
        ].join("");
    }

    function appHeaderActionsMarkup(route) {
        var langCode = normalizeLanguage((route && route.lang) || language);
        if (route && route.page === "detail" && route.productId) {
            return [
                '<a class="button" href="' + escapeHtml(buildIndexUrl(langCode)) + '">' + escapeHtml(t("backToList", null, langCode)) + "</a>",
                '<a class="button button--primary" href="' + escapeHtml(buildEditUrl(route.productId, langCode)) + '">' + escapeHtml(t("edit", null, langCode)) + "</a>"
            ].join("");
        }
        if (route && route.page === "form" && route.mode === "create") {
            return '<a class="button" href="' + escapeHtml(buildIndexUrl(langCode)) + '">' + escapeHtml(t("backToList", null, langCode)) + "</a>";
        }
        if (route && route.page === "form" && route.mode === "edit" && route.productId) {
            return [
                '<a class="button" href="' + escapeHtml(buildDetailUrl(route.productId, langCode)) + '">' + escapeHtml(t("view", null, langCode)) + "</a>",
                '<a class="button" href="' + escapeHtml(buildIndexUrl(langCode)) + '">' + escapeHtml(t("backToList", null, langCode)) + "</a>"
            ].join("");
        }
        if (route && route.page === "delete" && route.productId) {
            return [
                '<a class="button" href="' + escapeHtml(buildEditUrl(route.productId, langCode)) + '">' + escapeHtml(t("edit", null, langCode)) + "</a>",
                '<a class="button" href="' + escapeHtml(buildIndexUrl(langCode)) + '">' + escapeHtml(t("backToList", null, langCode)) + "</a>"
            ].join("");
        }
        return addButtonMarkup(langCode);
    }

    function appHeaderMarkup(route) {
        if (!route || route.page === "detail") {
            return "";
        }
        return [
            '<header class="app-header">',
            '    <div class="app-header__inner">',
            '        <div class="app-header__brand">' + brandMarkup(route.lang) + "</div>",
            '        <div class="app-header__controls">',
            '            <div class="app-header__actions">' + appHeaderActionsMarkup(route) + "</div>",
            '            <div class="app-header__language" data-app-header-language>' + headerLanguageMenuMarkup(route.lang, function (langCode) {
                return buildRouteUrl(route, langCode);
            }) + "</div>",
            "        </div>",
            "    </div>",
            "</header>"
        ].join("");
    }

    function fieldCardMarkup(langCode, config) {
        var label = choose(langCode, config.label);
        var hint = config.hint ? choose(langCode, config.hint) : "";
        var placeholder = config.placeholder ? choose(langCode, config.placeholder) : "";
        var inputId = config.id || config.name;
        var required = config.required ? " required" : "";
        var control = "";

        if (config.tag === "textarea") {
            control = '<textarea name="' + escapeHtml(config.name) + '" id="' + escapeHtml(inputId) + '" rows="' + escapeHtml(config.rows || 6) + '"' + required + "></textarea>";
        } else if (config.tag === "select") {
            control = [
                '<select name="' + escapeHtml(config.name) + '" id="' + escapeHtml(inputId) + '" data-placeholder="' + escapeHtml(placeholder) + '">',
                '    <option value="">' + escapeHtml(placeholder) + "</option>",
                "</select>"
            ].join("");
        } else {
            control = '<input type="' + escapeHtml(config.type || "text") + '" name="' + escapeHtml(config.name) + '" id="' + escapeHtml(inputId) + '"' + (config.accept ? ' accept="' + escapeHtml(config.accept) + '"' : "") + required + ' autocomplete="off">';
        }

        return [
            '<div class="field-card" data-field-name="' + escapeHtml(config.name) + '">',
            '    <div class="field-card__head">',
            '        <label for="' + escapeHtml(inputId) + '">' + escapeHtml(label) + "</label>",
            hint ? '        <p>' + escapeHtml(hint) + "</p>" : "",
            "    </div>",
            '    <div class="field-card__input">',
            control,
            "    </div>",
            "</div>"
        ].join("");
    }

    function createSidebarMarkup(langCode) {
        return [
            '<aside class="editor-sidebar">',
            '    <section class="sidebar-card">',
            '        <p class="section-kicker">' + escapeHtml(choose(langCode, { uz: "Ish oqimi", ru: "Рабочий поток", en: "Workflow" })) + "</p>",
            '        <h2>' + escapeHtml(choose(langCode, { uz: "Minimal, lekin puxta kiriting", ru: "Заполняйте коротко, но тщательно", en: "Keep it compact, but precise" })) + "</h2>",
            '        <ul class="note-list">',
            langCode === "ru"
                ? '            <li>Пишите названия в одном стиле и избегайте лишних сокращений.</li><li>Старайтесь держать описание в пределах 2-4 содержательных предложений.</li><li>Используйте чистое изображение, чтобы превью QR выглядело аккуратно.</li>'
                : langCode === "en"
                    ? '            <li>Keep names consistent and avoid unnecessary abbreviations.</li><li>Try to keep the description within 2-4 meaningful sentences.</li><li>Use a clean image so the QR preview looks polished.</li>'
                    : '            <li>Nomlarni bir xil uslubda yozing, keraksiz qisqartmalardan qoching.</li><li>Tavsif matnini 2-4 mazmunli gap atrofida ushlang.</li><li>Rasm fonini toza saqlang, QR preview chiroyli chiqadi.</li>',
            "        </ul>",
            "    </section>",
            '    <section class="sidebar-card sidebar-card--accent">',
            '        <p class="section-kicker">' + escapeHtml(choose(langCode, { uz: "Avtomatika", ru: "Автоматика", en: "Automation" })) + "</p>",
            '        <h2>' + escapeHtml(choose(langCode, { uz: "QR kod qo\'lda yuklanmaydi", ru: "QR код не загружается вручную", en: "The QR code is not uploaded manually" })) + "</h2>",
            '        <p>' + escapeHtml(choose(langCode, {
                uz: "Backend saqlashdan keyin avtomatik QR yaratadi. Sizdan talab qilinadigan qism: obyekt nomi, tavsifi va media fayllarning tartibli holati.",
                ru: "Backend создаст QR автоматически после сохранения. От вас требуется только аккуратно подготовить название, описание и медиафайлы.",
                en: "The backend creates the QR automatically after save. Your job is only to keep the title, description, and media files clean and structured."
            })) + "</p>",
            "    </section>",
            "</aside>"
        ].join("");
    }

    function editSidebarMarkup(langCode) {
        return [
            '<aside class="editor-sidebar">',
            '    <section class="sidebar-card">',
            '        <p class="section-kicker">' + escapeHtml(choose(langCode, { uz: "Joriy assetlar", ru: "Текущие файлы", en: "Current assets" })) + "</p>",
            '        <h2>' + escapeHtml(choose(langCode, { uz: "Mavjud ko\'rinish", ru: "Текущий вид", en: "Current preview" })) + "</h2>",
            '        <div class="asset-preview asset-preview--empty" data-preview-image>' + escapeHtml(t("coverMissing", null, langCode)) + "</div>",
            '        <div class="status-row">',
            '            <span class="status-chip" data-status-chip="video_uz">Video UZ</span>',
            '            <span class="status-chip" data-status-chip="video_ru">Video RU</span>',
            '            <span class="status-chip" data-status-chip="video_en">Video EN</span>',
            "        </div>",
            "    </section>",
            '    <section class="sidebar-card sidebar-card--accent">',
            '        <p class="section-kicker">QR preview</p>',
            '        <h2>' + escapeHtml(choose(langCode, { uz: "Avtomatik generatsiya", ru: "Автоматическая генерация", en: "Automatic generation" })) + "</h2>",
            '        <div class="asset-preview asset-preview--empty" data-preview-qr>' + escapeHtml(t("qrMissing", null, langCode)) + "</div>",
            '        <p>' + escapeHtml(choose(langCode, {
                uz: "Asosiy sahifaga qaytganda yoki detail sahifani ochganda yangilangan ko'rinish darhol seziladi.",
                ru: "После возврата на главную или открытия страницы деталей обновленный интерфейс будет виден сразу.",
                en: "The updated presentation is visible immediately when you return to the list or open the detail page."
            })) + "</p>",
            "    </section>",
            "</aside>"
        ].join("");
    }

    function listPageMarkup(route) {
        var langCode = route.lang;
        return [
            appHeaderMarkup(route),
            '<section class="filter-panel">',
            '    <div class="filter-panel__top">',
            '        <div><p class="section-kicker">' + escapeHtml(choose(langCode, { uz: "Filtrlar", ru: "Фильтры", en: "Filters" })) + '</p><h2>' + escapeHtml(choose(langCode, { uz: "Ro\'yxatni tez sozlang", ru: "Быстро настройте список", en: "Refine the list quickly" })) + "</h2></div>",
            '        <p class="filter-summary"><strong data-products-count>0</strong>' + escapeHtml(choose(langCode, { uz: "ta obyekt ko\'rinyapti", ru: "объектов видно", en: "objects visible" })) + "</p>",
            "    </div>",
            '    <form method="get" class="filter-form" data-auto-submit>',
            '        <input type="hidden" name="lang" value="' + escapeHtml(langCode) + '">',
            '        <div class="field-block"><label for="category">' + escapeHtml(choose(langCode, { uz: "Kategoriya", ru: "Категория", en: "Category" })) + '</label><select name="category" id="category" data-category-select data-selected-value="' + escapeHtml(route.category || "") + '"><option value="">' + escapeHtml(choose(langCode, { uz: "Barcha kategoriyalar", ru: "Все категории", en: "All categories" })) + "</option></select></div>",
            '        <div class="field-block"><label for="faculty">' + escapeHtml(choose(langCode, { uz: "Fakultet", ru: "Факультет", en: "Faculty" })) + '</label><select name="faculty" id="faculty" data-faculty-select data-selected-value="' + escapeHtml(route.faculty || "") + '"><option value="">' + escapeHtml(choose(langCode, { uz: "Barcha fakultetlar", ru: "Все факультеты", en: "All faculties" })) + "</option></select></div>",
            '        <div class="filter-actions"><p class="filter-note">' + escapeHtml(choose(langCode, { uz: "Tanlash avtomatik qo\'llanadi.", ru: "Изменения применяются автоматически.", en: "Changes apply automatically." })) + '</p><a class="button" href="' + escapeHtml(buildIndexUrl(langCode)) + '">' + escapeHtml(choose(langCode, { uz: "Tozalash", ru: "Сбросить", en: "Reset" })) + '</a><noscript><button type="submit" class="button button--primary">' + escapeHtml(choose(langCode, { uz: "Qo\'llash", ru: "Применить", en: "Apply" })) + "</button></noscript></div>",
            "    </form>",
            "</section>",
            '<div class="ui-feedback" data-list-feedback hidden></div>',
            '<section class="list-shell" data-list-shell hidden><div class="list-body" data-list-body></div></section>',
            '<section class="empty-state" data-empty-state hidden><p class="section-kicker">' + escapeHtml(t("emptyStateLabel", null, langCode)) + "</p><h2>" + escapeHtml(t("noItems", null, langCode)) + "</h2><p>" + escapeHtml(t("emptyBody", null, langCode)) + '</p><div class="empty-state__actions">' + addButtonMarkup(langCode) + '<a class="button" href="' + escapeHtml(buildIndexUrl(langCode)) + '">' + escapeHtml(t("backToList", null, langCode)) + "</a></div></section>"
        ].join("");
    }


    function detailPageMarkupV2(route) {
        var langCode = route.lang;
        return [
            appHeaderMarkup(route),
            '<div class="ui-feedback" data-detail-feedback hidden></div>',
            '<section class="detail-stage"><div class="detail-stage__ambience" aria-hidden="true"><span class="detail-stage__glow detail-stage__glow--one"></span><span class="detail-stage__glow detail-stage__glow--two"></span><span class="detail-stage__grid"></span></div>',
            '<article class="detail-stage__visual"><div class="detail-stage__visual-shell"><div class="detail-stage__language" data-detail-language></div><div class="detail-stage__visual-meta"><span class="detail-stage__visual-kicker">' + escapeHtml(choose(langCode, { uz: "Vizual profil", ru: "\u0412\u0438\u0437\u0443\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c", en: "Visual profile" })) + '</span><span class="detail-stage__visual-line"></span></div><div class="detail-stage__frame" data-visual-slot><div class="visual-card__placeholder">QR</div></div><div class="detail-stage__markers" aria-hidden="true"><span class="detail-stage__marker detail-stage__marker--active"></span><span class="detail-stage__marker"></span><span class="detail-stage__marker"></span></div></div><div class="detail-stage__media-slot detail-stage__media-slot--mobile" data-media-dock-mobile></div></article>',
            '<article class="detail-stage__copy"><div class="detail-stage__copy-head"><p class="eyebrow">' + escapeHtml(choose(langCode, { uz: "Obyekt tafsiloti", ru: "\u0414\u0435\u0442\u0430\u043b\u0438 \u043e\u0431\u044a\u0435\u043a\u0442\u0430", en: "Object detail" })) + '</p><a class="detail-backlink" href="' + escapeHtml(buildIndexUrl(langCode)) + '">' + escapeHtml(choose(langCode, { uz: "Katalogga qaytish", ru: "\u041d\u0430\u0437\u0430\u0434 \u043a \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443", en: "Back to catalog" })) + '</a></div><div class="detail-stage__headline"><h1 data-item-name>' + escapeHtml(choose(langCode, { uz: "Yuklanmoqda...", ru: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...", en: "Loading..." })) + '</h1><p class="detail-summary" data-item-summary>' + escapeHtml(t("shortDescriptionMissing", null, langCode)) + '</p><p class="lead-text" data-item-lead hidden></p></div>',
            '<dl class="detail-stage__facts"><div class="fact-chip"><dt>' + escapeHtml(choose(langCode, { uz: "Kategoriya", ru: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f", en: "Category" })) + '</dt><dd data-chip-category data-meta-category>' + escapeHtml(t("notAssigned", null, langCode)) + '</dd></div><div class="fact-chip"><dt>' + escapeHtml(choose(langCode, { uz: "Fakultet", ru: "\u0424\u0430\u043a\u0443\u043b\u044c\u0442\u0435\u0442", en: "Faculty" })) + '</dt><dd data-chip-faculty data-meta-faculty>' + escapeHtml(t("notAssigned", null, langCode)) + '</dd></div><div class="fact-chip"><dt>' + escapeHtml(choose(langCode, { uz: "O\'qituvchi", ru: "\u041f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u044c", en: "Teacher" })) + '</dt><dd data-chip-teacher data-meta-teacher>' + escapeHtml(t("notAssigned", null, langCode)) + '</dd></div><div class="fact-chip"><dt>' + escapeHtml(choose(langCode, { uz: "Yaratilgan", ru: "\u0421\u043e\u0437\u0434\u0430\u043d\u043e", en: "Created" })) + '</dt><dd data-meta-created></dd></div></dl>',
            '<div class="detail-stage__action-rack"><div class="detail-stage__action-copy"><p class="detail-stage__action-kicker">' + escapeHtml(choose(langCode, { uz: "Media kirish", ru: "\u041c\u0435\u0434\u0438\u0430 \u0434\u043e\u0441\u0442\u0443\u043f", en: "Media access" })) + '</p><span>' + escapeHtml(choose(langCode, { uz: "Audio, video va QR materiallarini shu joydan oching.", ru: "\u041e\u0442\u043a\u0440\u044b\u0432\u0430\u0439\u0442\u0435 \u0430\u0443\u0434\u0438\u043e, \u0432\u0438\u0434\u0435\u043e \u0438 QR \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u043e\u0442\u0441\u044e\u0434\u0430.", en: "Open audio, video, and QR materials from here." })) + '</span></div><div class="detail-stage__actions"><a class="detail-action detail-action--muted" href="#" data-action-audio aria-label="' + escapeHtml(choose(langCode, { uz: "Audio", ru: "\u0410\u0443\u0434\u0438\u043e", en: "Audio" })) + '"><span class="detail-action__icon" aria-hidden="true">' + AUDIO_ICON + '</span><span class="detail-action__label">' + escapeHtml(choose(langCode, { uz: "Audio", ru: "\u0410\u0443\u0434\u0438\u043e", en: "Audio" })) + '</span></a><a class="detail-action detail-action--muted" href="#" data-action-video aria-label="' + escapeHtml(choose(langCode, { uz: "Video", ru: "\u0412\u0438\u0434\u0435\u043e", en: "Video" })) + '"><span class="detail-action__icon" aria-hidden="true">' + VIDEO_ICON + '</span><span class="detail-action__label">' + escapeHtml(choose(langCode, { uz: "Video", ru: "\u0412\u0438\u0434\u0435\u043e", en: "Video" })) + '</span></a><a class="detail-action detail-action--qr detail-action--muted" href="#" data-action-qr aria-label="QR"><span class="detail-action__icon" aria-hidden="true">' + QR_ICON + '</span><span class="detail-action__label">QR</span></a></div></div>',
            '<div class="detail-inline-viewer" data-inline-viewer hidden><div class="detail-inline-viewer__dialog" data-inline-viewer-dialog role="region" aria-labelledby="detail-inline-viewer-title" tabindex="-1"><div class="detail-inline-viewer__head"><h2 class="detail-inline-viewer__title" id="detail-inline-viewer-title" data-inline-viewer-title>' + escapeHtml(choose(langCode, { uz: "Ko\'rish", ru: "\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440", en: "Preview" })) + '</h2><button type="button" class="detail-inline-viewer__close" data-inline-viewer-close aria-label="' + escapeHtml(choose(langCode, { uz: "Yopish", ru: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c", en: "Close" })) + '"><span aria-hidden="true">&times;</span></button></div><div class="detail-inline-viewer__body" data-inline-viewer-body></div></div></div>',
            '</article></section>',
        ].join("");
    }

    function createFormPageMarkup(route) {
        var hasRoute = !!route && typeof route === "object";
        var langCode = hasRoute ? route.lang : route;
        return [
            hasRoute ? appHeaderMarkup(route) : "",
            '<header class="editor-toolbar">',
            brandMarkup(langCode),
            '    <div class="editor-toolbar__actions"><a class="button" href="' + escapeHtml(buildIndexUrl(langCode)) + '">' + escapeHtml(choose(langCode, { uz: "Ro'yxatga qaytish", ru: "Назад к списку", en: "Back to list" })) + "</a></div>",
            "</header>",
            '<section class="editor-layout"><section class="editor-panel"><div class="form-status" data-form-status hidden></div><form method="post" enctype="multipart/form-data" class="item-form" data-api-form>',
            '<section class="form-section"><div class="section-head"><div><p class="section-kicker">' + escapeHtml(choose(langCode, { uz: "1-bo'lim", ru: "Раздел 1", en: "Section 1" })) + '</p><h2>' + escapeHtml(choose(langCode, { uz: "Tasnif va bog'lanishlar", ru: "Классификация и связи", en: "Classification and relations" })) + '</h2></div><p>' + escapeHtml(choose(langCode, { uz: "Obyekt qaysi kategoriya, fakultet va o'qituvchi bilan bog'lanishini belgilang.", ru: "Укажите, к какой категории, факультету и преподавателю относится объект.", en: "Specify which category, faculty, and teacher the object belongs to." })) + '</p></div><div class="field-grid field-grid--triple">' +
                fieldCardMarkup(langCode, { tag: "select", name: "category", label: { uz: "Kategoriya", ru: "Категория", en: "Category" }, hint: { uz: "Obyektni katalog ichida to'g'ri guruhlash uchun.", ru: "Нужно для правильной группировки объекта в каталоге.", en: "Used to place the object in the correct catalog group." }, placeholder: { uz: "Kategoriyani tanlang", ru: "Выберите категорию", en: "Select category" } }) +
                fieldCardMarkup(langCode, { tag: "select", name: "faculty", label: { uz: "Fakultet", ru: "Факультет", en: "Faculty" }, hint: { uz: "Agar obyekt fakultetga tegishli bo'lsa, shu yerda ko'rsating.", ru: "Если объект связан с факультетом, укажите его здесь.", en: "If the object belongs to a faculty, specify it here." }, placeholder: { uz: "Fakultetni tanlang", ru: "Выберите факультет", en: "Select faculty" } }) +
                fieldCardMarkup(langCode, { tag: "select", name: "teacher", label: { uz: "O'qituvchi", ru: "Преподаватель", en: "Teacher" }, hint: { uz: "Mas'ul shaxs yoki bog'liq o'qituvchini biriktiring.", ru: "Назначьте ответственного или связанного преподавателя.", en: "Assign the responsible or related teacher." }, placeholder: { uz: "O'qituvchini tanlang", ru: "Выберите преподавателя", en: "Select teacher" } }) +
                "</div></section>",
            '<section class="form-section"><div class="section-head"><div><p class="section-kicker">' + escapeHtml(choose(langCode, { uz: "2-bo'lim", ru: "Раздел 2", en: "Section 2" })) + '</p><h2>' + escapeHtml(choose(langCode, { uz: "Nomlar", ru: "Названия", en: "Names" })) + '</h2></div><p>' + escapeHtml(choose(langCode, { uz: "Bir xil obyekt nomini uch tilda soddalashtirilgan va bir xil uslubda kiriting.", ru: "Введите название объекта на трех языках в одном стиле и без лишних различий.", en: "Enter the object name in three languages using a consistent style." })) + '</p></div><div class="field-grid field-grid--triple">' +
                fieldCardMarkup(langCode, { name: "name_uz", required: true, label: { uz: "Nom (O'zbek)", ru: "Название (узбекский)", en: "Name (Uzbek)" }, hint: { uz: "Asosiy ko'rinishdagi nom.", ru: "Основное название объекта.", en: "Primary display name." } }) +
                fieldCardMarkup(langCode, { name: "name_ru", label: { uz: "Nom (Russian)", ru: "Название (русский)", en: "Name (Russian)" }, hint: { uz: "Rus tilidagi variant, kerak bo'lsa.", ru: "Русская версия названия, если нужна.", en: "Russian version of the name, if needed." } }) +
                fieldCardMarkup(langCode, { name: "name_en", label: { uz: "Nom (English)", ru: "Название (английский)", en: "Name (English)" }, hint: { uz: "Ingliz tilidagi variant, kerak bo'lsa.", ru: "Английская версия названия, если нужна.", en: "English version of the name, if needed." } }) +
                "</div></section>",
            '<section class="form-section"><div class="section-head"><div><p class="section-kicker">' + escapeHtml(choose(langCode, { uz: "3-bo'lim", ru: "Раздел 3", en: "Section 3" })) + '</p><h2>' + escapeHtml(choose(langCode, { uz: "Tavsiflar", ru: "Описания", en: "Descriptions" })) + '</h2></div><p>' + escapeHtml(choose(langCode, { uz: "QR sahifada ko'rinadigan matnni ixcham, foydali va o'qilishi oson tarzda kiriting.", ru: "Заполните короткий и полезный текст, который будет виден на QR странице.", en: "Write concise and useful text that will appear on the QR page." })) + '</p></div><div class="field-grid">' +
                fieldCardMarkup(langCode, { tag: "textarea", name: "description_uz", label: { uz: "Tavsif (O'zbek)", ru: "Описание (узбекский)", en: "Description (Uzbek)" }, hint: { uz: "Foydalanuvchi ko'radigan asosiy matn.", ru: "Основной текст, который увидит пользователь.", en: "Primary text shown to the user." } }) +
                fieldCardMarkup(langCode, { tag: "textarea", name: "description_ru", label: { uz: "Tavsif (Russian)", ru: "Описание (русский)", en: "Description (Russian)" }, hint: { uz: "Rus tilidagi matn.", ru: "Текст на русском языке.", en: "Text in Russian." } }) +
                fieldCardMarkup(langCode, { tag: "textarea", name: "description_en", label: { uz: "Tavsif (English)", ru: "Описание (английский)", en: "Description (English)" }, hint: { uz: "Ingliz tilidagi matn.", ru: "Текст на английском языке.", en: "Text in English." } }) +
                "</div></section>",
            '<section class="form-section"><div class="section-head"><div><p class="section-kicker">' + escapeHtml(choose(langCode, { uz: "4-bo'lim", ru: "Раздел 4", en: "Section 4" })) + '</p><h2>' + escapeHtml(choose(langCode, { uz: "Media birikmalari", ru: "Медиафайлы", en: "Media attachments" })) + '</h2></div><p>' + escapeHtml(choose(langCode, { uz: "Muqova, audio va video fayllarni tillar bo'yicha biriktiring.", ru: "Прикрепите обложку, аудио и видео по соответствующим языкам.", en: "Attach the cover image plus audio and video files for each language." })) + '</p></div><div class="media-stack">',
            '<section class="media-group media-group--cover"><div class="media-group__head"><div><p class="media-group__eyebrow">' + escapeHtml(choose(langCode, { uz: "Muqova", ru: "Обложка", en: "Cover" })) + '</p><h3>' + escapeHtml(choose(langCode, { uz: "Asosiy preview", ru: "Основное превью", en: "Main preview" })) + '</h3></div><p class="media-group__note">' + escapeHtml(choose(langCode, { uz: "Bu rasm katalog va detail sahifada asosiy preview sifatida ko'rinadi.", ru: "Это изображение будет видно в каталоге и на детальной странице.", en: "This image is shown in the catalog and on the detail page." })) + '</p></div><div class="field-grid media-grid">' + fieldCardMarkup(langCode, { type: "file", name: "img", accept: "image/*", label: { uz: "Muqova rasmi", ru: "Обложка", en: "Cover image" }, hint: { uz: "Katalog va detail sahifada ko'rinadigan asosiy rasm.", ru: "Основное изображение для каталога и детальной страницы.", en: "Primary image used in the catalog and detail view." } }) + '</div></section>',
            '<section class="media-group"><div class="media-group__head"><div><p class="media-group__eyebrow">Audio</p><h3>' + escapeHtml(choose(langCode, { uz: "Til versiyalari", ru: "Языковые версии", en: "Language versions" })) + '</h3></div><p class="media-group__note">' + escapeHtml(choose(langCode, { uz: "Har bir til uchun alohida audio fayl biriktiriladi.", ru: "Для каждой версии можно прикрепить отдельный аудиофайл.", en: "You can attach a separate audio file for each language." })) + '</p></div><div class="field-grid field-grid--triple media-grid">' +
                fieldCardMarkup(langCode, { type: "file", name: "audio_uz", accept: "audio/*", label: { uz: "Audio (O'zbek)", ru: "Аудио (узбекский)", en: "Audio (Uzbek)" }, hint: { uz: "UZ foydalanuvchilar uchun audio material.", ru: "Аудиоматериал для узбекской версии.", en: "Audio asset for Uzbek users." } }) +
                fieldCardMarkup(langCode, { type: "file", name: "audio_ru", accept: "audio/*", label: { uz: "Audio (Russian)", ru: "Аудио (русский)", en: "Audio (Russian)" }, hint: { uz: "RU foydalanuvchilar uchun audio material.", ru: "Аудиоматериал для русской версии.", en: "Audio asset for Russian users." } }) +
                fieldCardMarkup(langCode, { type: "file", name: "audio_en", accept: "audio/*", label: { uz: "Audio (English)", ru: "Аудио (английский)", en: "Audio (English)" }, hint: { uz: "EN foydalanuvchilar uchun audio material.", ru: "Аудиоматериал для английской версии.", en: "Audio asset for English users." } }) +
                "</div></section>",
            '<section class="media-group"><div class="media-group__head"><div><p class="media-group__eyebrow">Video</p><h3>' + escapeHtml(choose(langCode, { uz: "Til versiyalari", ru: "Языковые версии", en: "Language versions" })) + '</h3></div><p class="media-group__note">' + escapeHtml(choose(langCode, { uz: "Video fayllar ixtiyoriy va tillar bo\'yicha alohida saqlanadi.", ru: "Видео необязательно и хранится отдельно по языкам.", en: "Video files are optional and stored separately by language." })) + '</p></div><div class="field-grid field-grid--triple media-grid">' +
                fieldCardMarkup(langCode, { type: "file", name: "video_uz", accept: "video/*", label: { uz: "Video (O'zbek)", ru: "Видео (узбекский)", en: "Video (Uzbek)" }, hint: { uz: "Ixtiyoriy. UZ foydalanuvchilar uchun video material.", ru: "Необязательно. Видео для узбекской версии.", en: "Optional. Video asset for Uzbek users." } }) +
                fieldCardMarkup(langCode, { type: "file", name: "video_ru", accept: "video/*", label: { uz: "Video (Russian)", ru: "Видео (русский)", en: "Video (Russian)" }, hint: { uz: "Ixtiyoriy. RU foydalanuvchilar uchun video material.", ru: "Необязательно. Видео для русской версии.", en: "Optional. Video asset for Russian users." } }) +
                fieldCardMarkup(langCode, { type: "file", name: "video_en", accept: "video/*", label: { uz: "Video (English)", ru: "Видео (английский)", en: "Video (English)" }, hint: { uz: "Ixtiyoriy. EN foydalanuvchilar uchun video material.", ru: "Необязательно. Видео для английской версии.", en: "Optional. Video asset for English users." } }) +
                "</div></section></div></section>",
            '<footer class="form-footer"><button type="submit" class="button button--primary">' + escapeHtml(choose(langCode, { uz: "Obyektni saqlash", ru: "Сохранить объект", en: "Save object" })) + "</button></footer>",
            "</form></section>",
            createSidebarMarkup(langCode),
            "</section>"
        ].join("");
    }

    function editFormPageMarkup(route) {
        var langCode = route.lang;
        return [
            appHeaderMarkup(route),
            '<header class="editor-toolbar">',
            brandMarkup(langCode),
            '    <div class="editor-toolbar__actions"><a class="button" href="#" data-toolbar-view-link>' + escapeHtml(choose(langCode, { uz: "Ko'rish", ru: "Открыть", en: "View" })) + '</a><a class="button button--primary" href="' + escapeHtml(buildIndexUrl(langCode)) + '">' + escapeHtml(choose(langCode, { uz: "Ro'yxat", ru: "Список", en: "List" })) + "</a></div>",
            "</header>",
            createFormPageMarkup(langCode)
                .replace('<header class="editor-toolbar">' + brandMarkup(langCode) + '    <div class="editor-toolbar__actions"><a class="button" href="' + escapeHtml(buildIndexUrl(langCode)) + '">' + escapeHtml(choose(langCode, { uz: "Ro\'yxatga qaytish", ru: "Назад к списку", en: "Back to list" })) + "</a></div></header>", "")
                .replace('<footer class="form-footer"><button type="submit" class="button button--primary">' + escapeHtml(choose(langCode, { uz: "Obyektni saqlash", ru: "Сохранить объект", en: "Save object" })) + "</button></footer>", '<footer class="form-footer form-footer--spread"><button type="submit" class="button button--primary">' + escapeHtml(choose(langCode, { uz: "O\'zgarishlarni saqlash", ru: "Сохранить изменения", en: "Save changes" })) + '</button><a class="button button--danger" href="#" data-toolbar-delete-link>' + escapeHtml(choose(langCode, { uz: "Obyektni o\'chirish", ru: "Удалить объект", en: "Delete object" })) + "</a></footer>")
                .replace(createSidebarMarkup(langCode), editSidebarMarkup(langCode)),
        ].join("");
    }

    function deletePageMarkup(route) {
        var langCode = route.lang;
        return [
            appHeaderMarkup(route),
            '<section class="warning-shell">',
            '    <div class="warning-shell__content"><div class="form-status" data-delete-status hidden></div><p class="eyebrow">' + escapeHtml(choose(langCode, { uz: "Tasdiqlash", ru: "Подтверждение", en: "Confirmation" })) + '</p><h1 data-delete-title>' + escapeHtml(choose(langCode, { uz: "Shu yozuvni o\'chirmoqchimisiz?", ru: "Удалить запись?", en: "Delete this entry?" })) + '</h1><p class="warning-copy">' + escapeHtml(choose(langCode, {
                uz: "Bu amal qaytarilmaydi. Obyekt katalogdan, detail ko'rinishdan va u bilan bog'liq ishlatilayotgan tahrirlash oqimidan chiqib ketadi.",
                ru: "Это действие необратимо. Объект исчезнет из каталога, из детальной страницы и из текущего потока редактирования.",
                en: "This action cannot be undone. The object will disappear from the catalog, its detail page, and the current editing flow."
            })) + '</p><dl class="warning-meta"><div><dt>' + escapeHtml(choose(langCode, { uz: "Kategoriya", ru: "Категория", en: "Category" })) + '</dt><dd data-delete-category>' + escapeHtml(t("notAssigned", null, langCode)) + '</dd></div><div><dt>' + escapeHtml(choose(langCode, { uz: "Fakultet", ru: "Факультет", en: "Faculty" })) + '</dt><dd data-delete-faculty>' + escapeHtml(t("notAssigned", null, langCode)) + '</dd></div><div><dt>' + escapeHtml(choose(langCode, { uz: "Yaratilgan", ru: "Создано", en: "Created" })) + '</dt><dd data-delete-created></dd></div></dl></div>',
            '    <div class="warning-shell__aside"><div class="asset-preview asset-preview--empty" data-delete-image>' + escapeHtml(t("coverMissing", null, langCode)) + '</div></div>',
            '    <form method="post" class="warning-actions" data-delete-form><button type="submit" class="button button--danger">' + escapeHtml(choose(langCode, { uz: "Ha, o'chirish", ru: "Да, удалить", en: "Yes, delete" })) + '</button><a class="button" href="#" data-cancel-edit-link>' + escapeHtml(choose(langCode, { uz: "Bekor qilish", ru: "Отмена", en: "Cancel" })) + "</a></form>",
            "</section>"
        ].join("");
    }

    function renderRouteShell(route) {
        if (!root || !route) {
            return;
        }

        document.body.classList.remove("detail-modal-open");
        document.body.classList.toggle("detail-page", route.page === "detail");
        language = route.lang;
        document.documentElement.lang = route.lang;
        document.title = getPageTitle(route);
        updatePageStyle(route);

        root.dataset.page = route.page;
        root.dataset.lang = route.lang;
        root.dataset.mode = route.mode || "";
        root.dataset.productId = route.productId || "";
        root.className = route.page === "detail"
            ? "detail-shell"
            : route.page === "form"
                ? "editor-shell"
                : route.page === "delete"
                    ? "editor-shell editor-shell--warning"
                    : "page-shell";

        if (route.page === "detail") {
            root.innerHTML = detailPageMarkupV2(route);
            return;
        }
        if (route.page === "form" && route.mode === "create") {
            root.innerHTML = createFormPageMarkup(route);
            return;
        }
        if (route.page === "form" && route.mode === "edit") {
            root.innerHTML = editFormPageMarkup(route);
            return;
        }
        if (route.page === "delete") {
            root.innerHTML = deletePageMarkup(route);
            return;
        }
        root.innerHTML = listPageMarkup(route);
    }

    function shouldInterceptLink(link, event) {
        if (!link || event.defaultPrevented || event.button !== 0) {
            return false;
        }
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return false;
        }
        if (link.target && link.target !== "_self") {
            return false;
        }
        if (link.hasAttribute("download") || link.hasAttribute("data-no-navigation")) {
            return false;
        }
        var rawHref = link.getAttribute("href");
        if (!rawHref || rawHref.indexOf("#") === 0 || rawHref.indexOf("javascript:") === 0) {
            return false;
        }
        var url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) {
            return false;
        }
        if (/^\/(?:api|media|static|admin)(?:\/|$)/.test(url.pathname)) {
            return false;
        }
        if (!routeFromUrl(url.toString())) {
            return false;
        }
        if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) {
            return false;
        }
        return true;
    }

    function bindNavigation() {
        if (navigationBound) {
            return;
        }
        navigationBound = true;

        if (!window.history.state || !window.history.state.url) {
            window.history.replaceState({ url: window.location.href }, "", window.location.href);
        }

        document.addEventListener("click", function (event) {
            var floatingLanguageMenu = document.querySelector("[data-floating-language]");
            if (floatingLanguageMenu && floatingLanguageMenu.open && (!event.target.closest || !event.target.closest("[data-global-language-utility]"))) {
                floatingLanguageMenu.open = false;
            }

            var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
            if (!shouldInterceptLink(link, event)) {
                return;
            }
            event.preventDefault();
            navigateTo(link.href);
        });

        window.addEventListener("popstate", function () {
            navigateTo(window.location.href, { fromPopState: true, preserveScroll: true });
        });
    }

    function navigateTo(url, options) {
        var navigationOptions = options || {};
        var targetUrl = new URL(url, window.location.href);
        var route = routeFromUrl(targetUrl.toString());
        if (!route) {
            window.location.href = targetUrl.toString();
            return;
        }

        setNavigationState(true);
        try {
            stopSpeechPlayback();
            renderRouteShell(route);
            if (!navigationOptions.fromPopState) {
                var stateMethod = navigationOptions.replace ? "replaceState" : "pushState";
                window.history[stateMethod]({ url: route.url.toString() }, "", route.url.toString());
            }
            initializePage();
            if (!navigationOptions.preserveScroll) {
                window.scrollTo(0, 0);
            }
        } finally {
            setNavigationState(false);
        }
    }

    function renderListPage(pageRoot, pageLanguage, runId) {
        var form = pageRoot.querySelector("[data-auto-submit]");
        if (!form) {
            return;
        }

        var feedback = pageRoot.querySelector("[data-list-feedback]");
        var count = pageRoot.querySelector("[data-products-count]");
        var categorySelect = pageRoot.querySelector("[data-category-select]");
        var facultySelect = pageRoot.querySelector("[data-faculty-select]");
        var listShell = pageRoot.querySelector("[data-list-shell]");
        var listBody = pageRoot.querySelector("[data-list-body]");
        var emptyState = pageRoot.querySelector("[data-empty-state]");
        var initialCategoryValue = categorySelect ? (categorySelect.dataset.selectedValue || categorySelect.value || "") : "";
        var initialFacultyValue = facultySelect ? (facultySelect.dataset.selectedValue || facultySelect.value || "") : "";
        var isBootstrappingList = true;

        function updateLanguageLinks() {
            renderHeaderLanguageMenu(pageRoot.querySelector("[data-app-header-language]"), pageLanguage, function (langCode) {
                return buildIndexUrl(langCode, categorySelect && categorySelect.value, facultySelect && facultySelect.value);
            });
        }

        function renderProduct(product) {
            var nameText = localizeMultilingualValue(product.name, pageLanguage);
            var name = escapeHtml(nameText);
            var category = escapeHtml(product.category || t("noCategory", null, pageLanguage));
            var faculty = escapeHtml(product.faculty || t("noFaculty", null, pageLanguage));
            var teacher = escapeHtml(product.teacher_name || t("noTeacher", null, pageLanguage));
            var detailUrl = buildDetailUrl(product.id, pageLanguage);
            var imageMarkup = product.img
                ? '<img src="' + escapeHtml(resolveUrl(product.img)) + '" alt="' + name + '" loading="lazy" decoding="async">'
                : '<span class="row-thumb__placeholder">' + escapeHtml((nameText || "?").charAt(0).toUpperCase()) + "</span>";
            var qrMarkup = product.qr_code
                ? '<img src="' + escapeHtml(resolveUrl(product.qr_code)) + '" alt="' + name + ' QR" loading="lazy" decoding="async" fetchpriority="low">'
                : '<span class="row-qr__placeholder">QR</span>';

            return [
                '<article class="list-row" tabindex="0" role="link" aria-label="' + name + '" data-detail-url="' + escapeHtml(detailUrl) + '" data-product-id="' + escapeHtml(product.id) + '">',
                '  <div class="row-thumb">',
                "    " + imageMarkup,
                "  </div>",
                '  <div class="row-content">',
                '    <div class="row-meta">',
                "      <span>" + category + "</span>",
                "    </div>",
                '    <div class="row-titlebar"><div><h2>' + name + "</h2></div></div>",
                '    <dl class="row-facts">',
                "      <div><dt>" + escapeHtml(t("createdTime", null, pageLanguage)) + "</dt><dd>" + escapeHtml(formatDateTime(product.created_time, pageLanguage)) + "</dd></div>",
                "      <div><dt>QR</dt><dd>" + escapeHtml(product.qr_code ? t("qrReady", null, pageLanguage) : t("qrPending", null, pageLanguage)) + "</dd></div>",
                "    </dl>",
                '    <div class="row-details">',
                '      <div class="row-side"><p class="row-side__label">' + escapeHtml(t("facultyLabel", null, pageLanguage)) + '</p><p class="row-side__value">' + faculty + "</p></div>",
                '      <div class="row-side"><p class="row-side__label">' + escapeHtml(t("teacherLabel", null, pageLanguage)) + '</p><p class="row-side__value">' + teacher + "</p></div>",
                "    </div>",
                "  </div>",
                '  <div class="row-qr">',
                "    " + qrMarkup,
                "  </div>",
                "</article>"
            ].join("");
        }

        function renderProductSkeletons() {
            var skeletonRows = [];
            var index;

            for (index = 0; index < 4; index += 1) {
                skeletonRows.push([
                    '<article class="list-row list-row--skeleton" aria-hidden="true">',
                    '  <div class="row-thumb"><span class="skeleton-block"></span></div>',
                    '  <div class="row-content">',
                    '    <div class="row-meta"><span class="skeleton-pill"></span></div>',
                    '    <div class="row-titlebar"><div><span class="skeleton-line skeleton-line--title"></span><span class="skeleton-line skeleton-line--title skeleton-line--short"></span></div></div>',
                    '    <dl class="row-facts">',
                    '      <div><dt><span class="skeleton-inline skeleton-inline--label"></span></dt><dd><span class="skeleton-line skeleton-line--tiny"></span></dd></div>',
                    '      <div><dt><span class="skeleton-inline skeleton-inline--label"></span></dt><dd><span class="skeleton-line skeleton-line--tiny"></span></dd></div>',
                    '    </dl>',
                    '    <div class="row-details">',
                    '      <div class="row-side"><p class="row-side__label"><span class="skeleton-inline skeleton-inline--label"></span></p><p class="row-side__value"><span class="skeleton-line skeleton-line--medium"></span></p></div>',
                    '      <div class="row-side"><p class="row-side__label"><span class="skeleton-inline skeleton-inline--label"></span></p><p class="row-side__value"><span class="skeleton-line skeleton-line--short"></span></p></div>',
                    "    </div>",
                    "  </div>",
                    '  <div class="row-qr"><span class="skeleton-block skeleton-block--square"></span></div>',
                    "</article>"
                ].join(""));
            }

            return skeletonRows.join("");
        }

        function bindListRowNavigation() {
            if (!listBody) {
                return;
            }
            Array.prototype.forEach.call(listBody.querySelectorAll(".list-row[data-detail-url]"), function (row) {
                row.addEventListener("click", function (event) {
                    if (event.defaultPrevented) {
                        return;
                    }
                    navigateTo(row.dataset.detailUrl);
                });
                row.addEventListener("keydown", function (event) {
                    if (event.key !== "Enter" && event.key !== " ") {
                        return;
                    }
                    event.preventDefault();
                    navigateTo(row.dataset.detailUrl);
                });
            });
        }

        function updateUrl() {
            var url = new URL(window.location.href);
            url.searchParams.set("lang", pageLanguage);
            if (categorySelect && categorySelect.value) {
                url.searchParams.set("category", categorySelect.value);
            } else {
                url.searchParams.delete("category");
            }
            if (facultySelect && facultySelect.value) {
                url.searchParams.set("faculty", facultySelect.value);
            } else {
                url.searchParams.delete("faculty");
            }
            window.history.replaceState({ url: url.toString() }, "", url.toString());
            updateLanguageLinks();
        }

        async function loadLookups() {
            try {
                var lookupBundle = await getLookupBundle(pageLanguage);

                if (!isActivePage(pageRoot, runId)) {
                    return;
                }

                populateSelect(categorySelect, lookupBundle.categories, initialCategoryValue, pageLanguage);
                populateSelect(facultySelect, lookupBundle.faculties, initialFacultyValue, pageLanguage);
                updateLanguageLinks();
            } catch (error) {
                if (!isActivePage(pageRoot, runId)) {
                    return;
                }
                if (count) {
                    count.classList.remove("skeleton-inline");
                    count.textContent = "0";
                }
                if (listShell) {
                    listShell.hidden = true;
                }
                if (listBody) {
                    listBody.innerHTML = "";
                    listBody.classList.remove("is-loading");
                }
                if (emptyState) {
                    emptyState.hidden = true;
                }
                showFeedback(feedback, flattenError(error.payload) || t("lookupError", null, pageLanguage), "error");
            }
        }

        async function loadProducts() {
            if (!listBody) {
                return;
            }

            listBody.classList.add("is-loading");
            listBody.innerHTML = renderProductSkeletons();
            if (listShell) {
                listShell.hidden = false;
            }
            if (emptyState) {
                emptyState.hidden = true;
            }
            if (count) {
                count.classList.add("skeleton-inline");
                count.textContent = "";
            }
            hideFeedback(feedback);

            try {
                var products = await request(buildUrl(pageRoot.dataset.apiProducts, {
                    lang: pageLanguage,
                    category_id: categorySelect && categorySelect.value,
                    faculty_id: facultySelect && facultySelect.value
                }));

                if (!isActivePage(pageRoot, runId)) {
                    return;
                }

                if (count) {
                    count.classList.remove("skeleton-inline");
                    count.textContent = products.length;
                }
                listBody.innerHTML = products.map(renderProduct).join("");
                bindListRowNavigation();
                if (listShell) {
                    listShell.hidden = products.length === 0;
                }
                if (emptyState) {
                    emptyState.hidden = products.length !== 0;
                }
                updateUrl();
            } catch (error) {
                if (!isActivePage(pageRoot, runId)) {
                    return;
                }
                if (count) {
                    count.classList.remove("skeleton-inline");
                    count.textContent = "0";
                }
                if (listShell) {
                    listShell.hidden = true;
                }
                if (emptyState) {
                    emptyState.hidden = true;
                }
                listBody.innerHTML = "";
                showFeedback(feedback, flattenError(error.payload) || t("listError", null, pageLanguage), "error");
            } finally {
                if (isActivePage(pageRoot, runId)) {
                    listBody.classList.remove("is-loading");
                    if (isBootstrappingList) {
                        isBootstrappingList = false;
                        togglePageSkeleton(pageRoot, false);
                    }
                }
            }
        }

        form.addEventListener("change", function () {
            if (!isActivePage(pageRoot, runId)) {
                return;
            }
            loadProducts();
        });

        if (listBody) {
            listBody.classList.add("is-loading");
            listBody.innerHTML = renderProductSkeletons();
        }
        if (listShell) {
            listShell.hidden = false;
        }
        if (emptyState) {
            emptyState.hidden = true;
        }
        if (count) {
            count.classList.add("skeleton-inline");
            count.textContent = "";
        }
        togglePageSkeleton(pageRoot, true);

        loadLookups().then(function () {
            if (!isActivePage(pageRoot, runId)) {
                return;
            }
            loadProducts();
        });
    }

    function renderDetailPage(pageRoot, pageLanguage, runId) {
        var feedback = pageRoot.querySelector("[data-detail-feedback]");
        var productId = pageRoot.dataset.productId;
        if (!productId) {
            return;
        }

        togglePageSkeleton(pageRoot, true);

        function trimTextValue(text) {
            return String(text || "").replace(/\r/g, "").trim();
        }

        function excerptText(text, limit) {
            var compact = String(text || "").replace(/\s+/g, " ").trim();
            if (!compact || compact.length <= limit) {
                return compact;
            }
            return compact.slice(0, limit).replace(/\s+\S*$/, "") + "…";
        }

        function takeSentences(queue, count) {
            return queue.splice(0, count).join(" ").trim();
        }

        function sectionLabels() {
            return [
                {
                    eyebrow: choose(pageLanguage, { uz: "Boshlanish", ru: "Введение", en: "Intro" }),
                    title: choose(pageLanguage, { uz: "Qisqa intro", ru: "Краткое введение", en: "Quick intro" })
                },
                {
                    eyebrow: choose(pageLanguage, { uz: "Mazmun", ru: "Содержание", en: "Highlights" }),
                    title: choose(pageLanguage, { uz: "Asosiy xususiyatlar", ru: "Ключевые особенности", en: "Key features" })
                },
                {
                    eyebrow: choose(pageLanguage, { uz: "Tafsilot", ru: "Параметры", en: "Specs" }),
                    title: choose(pageLanguage, { uz: "Texnik parametlar", ru: "Технические параметры", en: "Technical parameters" })
                },
                {
                    eyebrow: choose(pageLanguage, { uz: "Amaliyot", ru: "Применение", en: "Usage" }),
                    title: choose(pageLanguage, { uz: "Qo'llanish sohasi", ru: "Сфера применения", en: "Use cases" })
                }
            ];
        }

        function buildStoryModel(text) {
            var fallbackText = trimTextValue(text) || t("noStory", null, pageLanguage);
            var paragraphs = fallbackText.split(/\n+/).map(function (part) {
                return part.trim();
            }).filter(Boolean);
            var sentences = (fallbackText.replace(/\s+/g, " ").match(/[^.!?]+[.!?]?/g) || []).map(function (part) {
                return part.trim();
            }).filter(Boolean);
            var descriptiveQueue = [];
            var numericQueue = [];

            sentences.forEach(function (sentence) {
                if (/[0-9]/.test(sentence)) {
                    numericQueue.push(sentence);
                } else {
                    descriptiveQueue.push(sentence);
                }
            });

            var intro = paragraphs[0] || takeSentences(descriptiveQueue, 2) || takeSentences(numericQueue, 1) || fallbackText;
            var features = paragraphs[1] || takeSentences(descriptiveQueue, 2) || takeSentences(numericQueue, 1);
            var specs = paragraphs[2] || takeSentences(numericQueue, 2) || takeSentences(descriptiveQueue, 2);
            var usage = paragraphs.slice(3).join(" ").trim() || takeSentences(descriptiveQueue, 3) || takeSentences(numericQueue, 2);
            var summarySource = intro;

            if (summarySource.length < 140 && features) {
                summarySource += " " + features;
            }

            return {
                summary: excerptText(summarySource, 220) || fallbackText,
                lead: excerptText(features || specs || usage, 160),
                sections: [intro, features, specs, usage].filter(Boolean)
            };
        }

        function pushUniqueSpec(highlights, value, maxLength) {
            var cleaned = trimTextValue(value).replace(/\s+/g, " ").replace(/[\u201C\u201D"]/g, '"');
            var key;
            var index;
            if (!cleaned || cleaned.length > (maxLength || 28)) {
                return;
            }
            key = cleaned.toLowerCase();
            for (index = 0; index < highlights.length; index += 1) {
                if (highlights[index].toLowerCase() === key) {
                    return;
                }
            }
            highlights.push(cleaned);
        }

        function buildSpecHighlights(nameValue, text, product) {
            var highlights = [];
            var source = trimTextValue([nameValue, text].filter(Boolean).join(" "));
            var patterns = [
                /\b\d+(?:[.,]\d+)?\s?(?:MP|Mpx|GHz|MHz|kHz|Hz|GB|TB|MB|fps|mm|cm|kg|g|W|V|mAh|nm|um|mkm)\b/gi,
                /\b\d+(?:[.,]\d+)?x\b/gi,
                /\b\d+(?:[.,]\d+)?\s?(?:dyuym|inch)\b(?:\s?(?:LCD|LED|IPS|OLED))?/gi,
                /\b\d+(?:[.,]\d+)?(?:["\u2033\u201D])\s?(?:LCD|LED|IPS|OLED)?\b/gi,
                /\b(?:HDMI(?:\s*\+\s*USB(?:-C)?)?|USB(?:-C)?(?:\s*\+\s*HDMI)?|Type-C|LCD|LED|IPS|OLED|Wi-?Fi|Bluetooth|Full HD|4K)\b/gi
            ];

            patterns.forEach(function (pattern) {
                (source.match(pattern) || []).forEach(function (match) {
                    pushUniqueSpec(highlights, match, 24);
                });
            });

            [product && product.category, product && product.faculty].forEach(function (value) {
                if (highlights.length < 4) {
                    pushUniqueSpec(highlights, value, 26);
                }
            });

            return highlights.slice(0, 4);
        }

        function specLineHtml(items) {
            return items.map(function (item) {
                return '<span class="detail-spec-line__item">' + escapeHtml(item) + "</span>";
            }).join("");
        }

        function storyHtml(model) {
            var labels = sectionLabels();
            var sections = model && model.sections && model.sections.length ? model.sections : [t("noStory", null, pageLanguage)];

            return sections.map(function (sectionText, index) {
                var label = labels[Math.min(index, labels.length - 1)];
                var safeText = escapeHtml(sectionText).replace(/\n+/g, "</p><p>");
                var ordinal = index + 1 < 10 ? "0" + (index + 1) : String(index + 1);
                return '<section class="story-section"><div class="story-section__head"><span class="story-section__index">' + escapeHtml(ordinal) + '</span><div><p class="story-section__eyebrow">' + escapeHtml(label.eyebrow) + '</p><h3>' + escapeHtml(label.title) + '</h3></div></div><div class="story-section__body"><p>' + safeText + "</p></div></section>";
            }).join("");
        }

        function inlineViewerHtml(kind, payload, name) {
            if (!payload) {
                return '<p class="media-empty">' + escapeHtml(kind === "audio" ? t("noAudio", null, pageLanguage) : kind === "video" ? t("noVideo", null, pageLanguage) : t("qrMissing", null, pageLanguage)) + "</p>";
            }
            if (kind === "audio") {
                return '<audio controls autoplay preload="metadata"><source src="' + escapeHtml(resolveUrl(payload)) + '"></audio>';
            }
            if (kind === "video") {
                return '<video controls playsinline preload="metadata"><source src="' + escapeHtml(resolveUrl(payload)) + '"></video>';
            }
            return '<div class="detail-inline-viewer__qr"><img src="' + escapeHtml(resolveUrl(payload)) + '" alt="' + escapeHtml(name) + ' QR" loading="lazy" decoding="async"></div>';
        }

        var loadingTargets = [
            pageRoot.querySelector("[data-story-copy]"),
            pageRoot.querySelector("[data-visual-slot]"),
            pageRoot.querySelector("[data-qr-slot]")
        ];

        loadingTargets.forEach(function (element) {
            if (element) {
                element.classList.add("is-loading");
            }
        });

        request(buildApiDetailUrl(pageRoot.dataset.apiProducts, productId, { lang: pageLanguage }))
            .then(function (product) {
                if (!isActivePage(pageRoot, runId)) {
                    return;
                }

                hideFeedback(feedback);

                var name = localizeMultilingualValue(product.name, pageLanguage);
                var description = localizeMultilingualValue(product.description, pageLanguage);
                var aboutText = localizeMultilingualValue(product.about, pageLanguage);
                var primaryStory = aboutText || description;
                var storyModel = buildStoryModel(primaryStory);
                var specHighlights = buildSpecHighlights(name, primaryStory, product);
                var speechText = normalizeSpeechText(primaryStory);
                var hasSpeechText = !!speechText;
                var summary = trimTextValue(primaryStory) || t("shortDescriptionMissing", null, pageLanguage);
                var qrUrl = product.qr_code && resolveUrl(product.qr_code);
                var videoUrl = localizeAssetValue(product.video, pageLanguage);
                var isVideoEnabled = false;
                var category = product.category || t("notAssigned", null, pageLanguage);
                var faculty = product.faculty || t("notAssigned", null, pageLanguage);
                var teacher = product.teacher_name || t("notAssigned", null, pageLanguage);

                document.title = name + " | " + t("detailTitle", null, pageLanguage);

                Array.prototype.forEach.call(pageRoot.querySelectorAll("[data-item-name]"), function (element) {
                    element.textContent = name;
                });

                var summaryElement = pageRoot.querySelector("[data-item-summary]");
                if (summaryElement) {
                    summaryElement.textContent = summary;
                }

                var specLineElement = pageRoot.querySelector("[data-item-spec-line]");
                if (specLineElement) {
                    if (specHighlights.length) {
                        specLineElement.hidden = false;
                        specLineElement.innerHTML = specLineHtml(specHighlights);
                    } else {
                        specLineElement.hidden = true;
                        specLineElement.innerHTML = "";
                    }
                }

                var visualSlot = pageRoot.querySelector("[data-visual-slot]");
                if (visualSlot) {
                    visualSlot.innerHTML = product.img
                        ? '<img src="' + escapeHtml(resolveUrl(product.img)) + '" alt="' + escapeHtml(name) + '" decoding="async" fetchpriority="high">'
                        : '<div class="visual-card__placeholder">' + escapeHtml((name || "?").charAt(0).toUpperCase()) + "</div>";
                }

                var qrSlot = pageRoot.querySelector("[data-qr-slot]");
                if (qrSlot) {
                    qrSlot.innerHTML = qrUrl
                        ? '<img src="' + escapeHtml(qrUrl) + '" alt="' + escapeHtml(name) + ' QR" loading="lazy" decoding="async">'
                        : '<div class="qr-card__placeholder">QR</div>';
                }

                var qrButton = pageRoot.querySelector("[data-download-qr-button]");
                var detailLanguage = pageRoot.querySelector("[data-detail-language]");
                if (qrButton) {
                    if (qrUrl) {
                        qrButton.hidden = false;
                        qrButton.href = qrUrl;
                        qrButton.setAttribute("download", "");
                    } else {
                        qrButton.hidden = true;
                        qrButton.href = "#";
                        qrButton.removeAttribute("download");
                    }
                }

                renderHeaderLanguageMenu(detailLanguage, pageLanguage, function (langCode) {
                    return buildDetailUrl(productId, langCode);
                });

                var audioAction = pageRoot.querySelector("[data-action-audio]");
                var videoAction = pageRoot.querySelector("[data-action-video]");
                var qrAction = pageRoot.querySelector("[data-action-qr]");
                var actionRack = pageRoot.querySelector(".detail-stage__action-rack");
                var inlineViewer = pageRoot.querySelector("[data-inline-viewer]");
                var inlineViewerDialog = pageRoot.querySelector("[data-inline-viewer-dialog]");
                var inlineViewerBody = pageRoot.querySelector("[data-inline-viewer-body]");
                var inlineViewerTitle = pageRoot.querySelector("[data-inline-viewer-title]");
                var mobileDockHost = pageRoot.querySelector("[data-media-dock-mobile]");
                var currentViewerKind = "";
                var generatedAudioUrl = "";
                var useServerTts = !!pageRoot.dataset.apiTts && hasSpeechText;
                var audioRequestPromise = null;
                var audioCacheKey = useServerTts ? [productId, pageLanguage, speechText].join("::") : "";
                var viewerFlowMediaQuery = typeof window !== "undefined" && typeof window.matchMedia === "function"
                    ? window.matchMedia("(max-width: 760px)")
                    : null;
                var desktopDockHost = null;
                var mediaDock = null;

                if (actionRack && inlineViewer && actionRack.parentNode) {
                    desktopDockHost = document.createElement("div");
                    desktopDockHost.className = "detail-stage__media-slot detail-stage__media-slot--desktop";
                    desktopDockHost.setAttribute("data-media-dock-desktop", "");
                    mediaDock = document.createElement("div");
                    mediaDock.className = "detail-stage__media-dock";
                    mediaDock.setAttribute("data-media-dock", "");
                    actionRack.parentNode.insertBefore(desktopDockHost, actionRack);
                    mediaDock.appendChild(actionRack);
                    mediaDock.appendChild(inlineViewer);
                    desktopDockHost.appendChild(mediaDock);
                }

                function syncMediaDockPlacement() {
                    if (!mediaDock) {
                        return;
                    }
                    var useMobileDock = !!(viewerFlowMediaQuery && viewerFlowMediaQuery.matches && mobileDockHost);
                    if (useMobileDock) {
                        if (mediaDock.parentNode !== mobileDockHost) {
                            mobileDockHost.appendChild(mediaDock);
                        }
                        return;
                    }
                    if (desktopDockHost && mediaDock.parentNode !== desktopDockHost) {
                        desktopDockHost.appendChild(mediaDock);
                    }
                }

                if (viewerFlowMediaQuery) {
                    if (typeof viewerFlowMediaQuery.addEventListener === "function") {
                        viewerFlowMediaQuery.addEventListener("change", syncMediaDockPlacement);
                    } else if (typeof viewerFlowMediaQuery.addListener === "function") {
                        viewerFlowMediaQuery.addListener(syncMediaDockPlacement);
                    }
                }
                syncMediaDockPlacement();

                function clearGeneratedAudio() {
                    if (generatedAudioUrl) {
                        URL.revokeObjectURL(generatedAudioUrl);
                        generatedAudioUrl = "";
                    }
                }

                function setAudioBusy(isBusy) {
                    if (!audioAction) {
                        return;
                    }
                    audioAction.classList.toggle("detail-action--loading", !!isBusy);
                    if (isBusy) {
                        audioAction.setAttribute("aria-busy", "true");
                    } else {
                        audioAction.removeAttribute("aria-busy");
                    }
                }

                function inlineViewerHeading(kind) {
                    if (kind === "audio") {
                        return choose(pageLanguage, { uz: "Audio", ru: "Аудио", en: "Audio" });
                    }
                    if (kind === "video") {
                        return choose(pageLanguage, { uz: "Video", ru: "Видео", en: "Video" });
                    }
                    return choose(pageLanguage, { uz: "QR kod", ru: "QR-код", en: "QR code" });
                }

                function setInlineViewer(kind, payload) {
                    currentViewerKind = kind && payload ? kind : "";
                    [[audioAction, "audio"], [videoAction, "video"], [qrAction, "qr"]].forEach(function (entry) {
                        if (entry[0]) {
                            entry[0].classList.toggle("detail-action--active", currentViewerKind === entry[1]);
                        }
                    });
                    if (!inlineViewer || !inlineViewerBody) {
                        return;
                    }
                    inlineViewer.classList.remove("detail-inline-viewer--audio", "detail-inline-viewer--video", "detail-inline-viewer--qr");
                    if (!currentViewerKind) {
                        clearGeneratedAudio();
                        inlineViewer.hidden = true;
                        inlineViewerBody.innerHTML = "";
                        return;
                    }
                    if (currentViewerKind !== "audio") {
                        clearGeneratedAudio();
                    }
                    inlineViewer.hidden = false;
                    inlineViewer.classList.add("detail-inline-viewer--" + currentViewerKind);
                    if (inlineViewerTitle) {
                        inlineViewerTitle.textContent = inlineViewerHeading(currentViewerKind);
                    }
                    inlineViewerBody.innerHTML = inlineViewerHtml(currentViewerKind, payload, name);
                    if (inlineViewerDialog && typeof inlineViewerDialog.focus === "function") {
                        inlineViewerDialog.focus();
                    }
                    if (currentViewerKind === "audio") {
                        var audioPlayer = inlineViewerBody.querySelector("audio");
                        if (audioPlayer && typeof audioPlayer.play === "function") {
                            var playAttempt = audioPlayer.play();
                            if (playAttempt && typeof playAttempt.catch === "function") {
                                playAttempt.catch(function () {});
                            }
                        }
                    }
                }

                function closeInlineViewer() {
                    stopSpeechPlayback();
                    setInlineViewer("", "");
                }

                function loadServerAudioBlob() {
                    if (!speechText) {
                        return Promise.reject(new Error("tts-missing-text"));
                    }
                    if (audioCacheKey && ttsAudioBlobCache.has(audioCacheKey)) {
                        return Promise.resolve(ttsAudioBlobCache.get(audioCacheKey));
                    }
                    if (audioRequestPromise) {
                        return audioRequestPromise;
                    }
                    setAudioBusy(true);
                    audioRequestPromise = prefetchTtsAudio(pageRoot.dataset.apiTts, productId, pageLanguage, speechText).then(function (audioBlob) {
                        if (audioCacheKey && audioBlob) {
                            rememberTtsAudioBlob(audioCacheKey, audioBlob);
                        }
                        return audioBlob;
                    }).finally(function () {
                        audioRequestPromise = null;
                        if (isActivePage(pageRoot, runId)) {
                            setAudioBusy(false);
                        }
                    });
                    return audioRequestPromise;
                }

                function playServerAudio() {
                    stopSpeechPlayback();
                    clearGeneratedAudio();
                    return loadServerAudioBlob().then(function (audioBlob) {
                        if (!isActivePage(pageRoot, runId) || !audioBlob) {
                            return;
                        }
                        generatedAudioUrl = URL.createObjectURL(audioBlob);
                        setInlineViewer("audio", generatedAudioUrl);
                    });
                }

                if (audioAction) {
                    audioAction.classList.toggle("detail-action--muted", !useServerTts);
                    audioAction.href = "#";
                    audioAction.onclick = function (event) {
                        event.preventDefault();
                        if (!useServerTts) {
                            showFeedback(feedback, t("ttsUnsupported", null, pageLanguage), "error");
                            return;
                        }
                        if (currentViewerKind === "audio") {
                            closeInlineViewer();
                            return;
                        }
                        playServerAudio().catch(function (error) {
                            if (!isActivePage(pageRoot, runId)) {
                                return;
                            }
                            showFeedback(feedback, flattenError(error.payload) || t("ttsUnsupported", null, pageLanguage), "error");
                        });
                    };
                }

                [[videoAction, "video", videoUrl, isVideoEnabled], [qrAction, "qr", qrUrl, true]].forEach(function (entry) {
                    var action = entry[0];
                    var kind = entry[1];
                    var url = entry[2];
                    var isEnabled = entry[3];
                    if (!action) {
                        return;
                    }
                    action.classList.toggle("detail-action--muted", !url || !isEnabled);
                    if (isEnabled && url) {
                        action.removeAttribute("aria-disabled");
                    } else {
                        action.setAttribute("aria-disabled", "true");
                    }
                    action.href = "#";
                    action.onclick = function (event) {
                        event.preventDefault();
                        if (!url || !isEnabled) {
                            return;
                        }
                        if (currentViewerKind === kind) {
                            closeInlineViewer();
                            return;
                        }
                        stopSpeechPlayback();
                        setInlineViewer(kind, url);
                    };
                });

                Array.prototype.forEach.call(pageRoot.querySelectorAll("[data-inline-viewer-close]"), function (element) {
                    element.addEventListener("click", function (event) {
                        event.preventDefault();
                        closeInlineViewer();
                    });
                });

                if (inlineViewerDialog) {
                    inlineViewerDialog.addEventListener("keydown", function (event) {
                        if (event.key !== "Escape") {
                            return;
                        }
                        event.preventDefault();
                        closeInlineViewer();
                    });
                }

                setInlineViewer("", "");

                var created = formatDateTime(product.created_time, pageLanguage);
                var metaMap = {
                    "[data-meta-category]": category,
                    "[data-meta-faculty]": faculty,
                    "[data-meta-teacher]": teacher,
                    "[data-meta-created]": created,
                    "[data-chip-category]": category,
                    "[data-chip-faculty]": faculty,
                    "[data-chip-teacher]": teacher
                };

                Object.keys(metaMap).forEach(function (selector) {
                    var element = pageRoot.querySelector(selector);
                    if (element) {
                        element.textContent = metaMap[selector];
                    }
                });

                var lead = pageRoot.querySelector("[data-item-lead]");
                if (lead) {
                    var leadText = storyModel.lead || (description && normalizeSpeechText(description) !== normalizeSpeechText(primaryStory) ? excerptText(description, 160) : "");
                    lead.hidden = !leadText;
                    lead.textContent = leadText;
                }

                var story = pageRoot.querySelector("[data-story-copy]");
                if (story) {
                    story.innerHTML = storyHtml(storyModel);
                }
            })
            .catch(function (error) {
                if (!isActivePage(pageRoot, runId)) {
                    return;
                }
                stopSpeechPlayback();
                showFeedback(feedback, flattenError(error.payload) || t("detailError", null, pageLanguage), "error");
            })
            .finally(function () {
                if (!isActivePage(pageRoot, runId)) {
                    return;
                }
                loadingTargets.forEach(function (element) {
                    if (element) {
                        element.classList.remove("is-loading");
                    }
                });
                togglePageSkeleton(pageRoot, false);
            });
    }

    function serializeProductForm(form) {
        var payload = new FormData();
        ["name_uz", "name_ru", "name_en", "description_uz", "description_ru", "description_en"].forEach(function (name) {
            if (form.elements[name]) {
                payload.append(name, form.elements[name].value || "");
            }
        });
        [["category", "category_id"], ["faculty", "faculty_id"], ["teacher", "teacher_id"]].forEach(function (pair) {
            if (form.elements[pair[0]]) {
                payload.append(pair[1], form.elements[pair[0]].value || "");
            }
        });
        ["img", "video_uz", "video_ru", "video_en"].forEach(function (name) {
            var input = form.elements[name];
            if (input && input.files && input.files[0]) {
                payload.append(name, input.files[0]);
            }
        });
        return payload;
    }

    function populateFormFromProduct(form, product) {
        var values = {
            name_uz: product.name && product.name.uz,
            name_ru: product.name && product.name.ru,
            name_en: product.name && product.name.en,
            description_uz: product.description && product.description.uz,
            description_ru: product.description && product.description.ru,
            description_en: product.description && product.description.en,
            category: product.category_id,
            faculty: product.faculty_id,
            teacher: product.teacher_id
        };
        Object.keys(values).forEach(function (key) {
            if (form.elements[key]) {
                form.elements[key].value = values[key] == null ? "" : values[key];
            }
        });
    }

    function updateEditSidebar(pageRoot, pageLanguage, product) {
        var imageSlot = pageRoot.querySelector("[data-preview-image]");
        if (imageSlot) {
            if (product.img) {
                imageSlot.className = "asset-preview asset-preview--image";
                imageSlot.innerHTML = '<img src="' + escapeHtml(resolveUrl(product.img)) + '" alt="' + escapeHtml(localizeMultilingualValue(product.name, pageLanguage)) + '" decoding="async">';
            } else {
                imageSlot.className = "asset-preview asset-preview--empty";
                imageSlot.textContent = t("coverMissing", null, pageLanguage);
            }
        }

        var qrSlot = pageRoot.querySelector("[data-preview-qr]");
        if (qrSlot) {
            if (product.qr_code) {
                qrSlot.className = "asset-preview asset-preview--qr";
                qrSlot.innerHTML = '<img src="' + escapeHtml(resolveUrl(product.qr_code)) + '" alt="QR preview" loading="lazy" decoding="async">';
            } else {
                qrSlot.className = "asset-preview asset-preview--empty";
                qrSlot.textContent = t("qrMissing", null, pageLanguage);
            }
        }

        Array.prototype.forEach.call(pageRoot.querySelectorAll("[data-status-chip]"), function (chip) {
            var field = chip.dataset.statusChip;
            var source = product.video;
            var langKey = field.split("_")[1];
            var active = !!(source && source[langKey]);
            chip.classList.toggle("status-chip--active", active);
        });
    }

    function stripLegacyAudioUploadUi(form, pageLanguage) {
        var audioGroup = null;
        ["audio_uz", "audio_ru", "audio_en"].forEach(function (name) {
            var input = form.elements[name];
            if (input && !audioGroup) {
                audioGroup = input.closest(".media-group");
            }
        });
        if (audioGroup) {
            audioGroup.remove();
        }

        var mediaStack = form.querySelector(".media-stack");
        var mediaHead = mediaStack && mediaStack.previousElementSibling;
        var mediaIntro = mediaHead && mediaHead.querySelector("p:last-child");
        if (mediaIntro) {
            mediaIntro.textContent = choose(pageLanguage, {
                uz: "Muqova rasmi va video fayllarni tillar bo'yicha biriktiring. Audio avtomatik generatsiya qilinadi.",
                ru: "Прикрепите обложку и видеофайлы по языкам. Аудио будет сгенерировано автоматически.",
                en: "Attach the cover image and video files for each language. Audio is generated automatically."
            });
        }
    }

    function renderFormPage(pageRoot, pageLanguage, runId) {
        var form = pageRoot.querySelector("[data-api-form]");
        if (!form) {
            return;
        }

        stripLegacyAudioUploadUi(form, pageLanguage);

        var feedback = pageRoot.querySelector("[data-form-status]");
        var submitButton = form.querySelector("button[type='submit']");
        var isEdit = pageRoot.dataset.mode === "edit";
        var productId = pageRoot.dataset.productId;
        var viewLink = pageRoot.querySelector("[data-toolbar-view-link]");
        var deleteLink = pageRoot.querySelector("[data-toolbar-delete-link]");

        if (isEdit && productId) {
            if (viewLink) {
                viewLink.href = buildDetailUrl(productId, pageLanguage);
            }
            if (deleteLink) {
                deleteLink.href = buildDeleteUrl(productId, pageLanguage);
            }
        }

        togglePageSkeleton(pageRoot, true);
        var currentProductRequest = isEdit ? request(buildApiDetailUrl(pageRoot.dataset.apiProducts, productId, { lang: pageLanguage })) : Promise.resolve(null);

        Promise.all([
            getLookupBundle(pageLanguage),
            currentProductRequest
        ])
            .then(function (results) {
                if (!isActivePage(pageRoot, runId)) {
                    return;
                }

                var lookupBundle = results[0];
                var product = results[1];

                populateSelect(form.elements.category, lookupBundle.categories, product && product.category_id, pageLanguage);
                populateSelect(form.elements.faculty, lookupBundle.faculties, product && product.faculty_id, pageLanguage);
                populateSelect(form.elements.teacher, lookupBundle.teachers, product && product.teacher_id, pageLanguage);

                if (product) {
                    document.title = localizeMultilingualValue(product.name, pageLanguage) + " | " + choose(pageLanguage, { uz: "Obyektni Tahrirlash", ru: "Редактирование объекта", en: "Edit Object" });
                    populateFormFromProduct(form, product);
                    updateEditSidebar(pageRoot, pageLanguage, product);
                }
                hideFeedback(feedback);
            })
            .catch(function (error) {
                if (!isActivePage(pageRoot, runId)) {
                    return;
                }
                showFeedback(feedback, flattenError(error.payload) || t("formLoadError", null, pageLanguage), "error");
            })
            .finally(function () {
                if (!isActivePage(pageRoot, runId)) {
                    return;
                }
                togglePageSkeleton(pageRoot, false);
            });

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            if (!isActivePage(pageRoot, runId)) {
                return;
            }

            hideFeedback(feedback);
            toggleButtonBusy(submitButton, true);

            var url = pageRoot.dataset.apiProducts;
            var method = "POST";
            if (isEdit && productId) {
                url = buildApiDetailUrl(pageRoot.dataset.apiProducts, productId);
                method = "PATCH";
            }

            request(url, {
                method: method,
                headers: { "X-CSRFToken": getCsrfToken() },
                body: serializeProductForm(form)
            })
                .then(function () {
                    if (!isActivePage(pageRoot, runId)) {
                        return;
                    }
                    showFeedback(feedback, t("saveSuccess", null, pageLanguage), "success");
                    navigateTo(buildIndexUrl(pageLanguage), { replace: true });
                })
                .catch(function (error) {
                    if (!isActivePage(pageRoot, runId)) {
                        return;
                    }
                    showFeedback(feedback, flattenError(error.payload) || t("saveError", null, pageLanguage), "error");
                })
                .finally(function () {
                    if (isActivePage(pageRoot, runId)) {
                        toggleButtonBusy(submitButton, false);
                    }
                });
        });
    }

    function renderDeletePage(pageRoot, pageLanguage, runId) {
        var form = pageRoot.querySelector("[data-delete-form]");
        var feedback = pageRoot.querySelector("[data-delete-status]");
        var productId = pageRoot.dataset.productId;
        var cancelEditLink = pageRoot.querySelector("[data-cancel-edit-link]");
        if (!form || !productId) {
            return;
        }

        var submitButton = form.querySelector("button[type='submit']");
        if (cancelEditLink) {
            cancelEditLink.href = buildEditUrl(productId, pageLanguage);
        }

        togglePageSkeleton(pageRoot, true);
        request(buildApiDetailUrl(pageRoot.dataset.apiProducts, productId, { lang: pageLanguage }))
            .then(function (product) {
                if (!isActivePage(pageRoot, runId)) {
                    return;
                }

                var name = localizeMultilingualValue(product.name, pageLanguage);
                document.title = name + " | " + choose(pageLanguage, { uz: "Obyektni O'chirish", ru: "Удаление объекта", en: "Delete Object" });

                var title = pageRoot.querySelector("[data-delete-title]");
                var category = pageRoot.querySelector("[data-delete-category]");
                var faculty = pageRoot.querySelector("[data-delete-faculty]");
                var created = pageRoot.querySelector("[data-delete-created]");
                var image = pageRoot.querySelector("[data-delete-image]");

                if (title) {
                    title.textContent = t("deleteQuestion", { name: name }, pageLanguage);
                }
                if (category) {
                    category.textContent = product.category || t("notAssigned", null, pageLanguage);
                }
                if (faculty) {
                    faculty.textContent = product.faculty || t("notAssigned", null, pageLanguage);
                }
                if (created) {
                    created.textContent = formatDateTime(product.created_time, pageLanguage);
                }
                if (image) {
                    if (product.img) {
                        image.className = "asset-preview asset-preview--image";
                        image.innerHTML = '<img src="' + escapeHtml(resolveUrl(product.img)) + '" alt="' + escapeHtml(name) + '" loading="lazy" decoding="async">';
                    } else {
                        image.className = "asset-preview asset-preview--empty";
                        image.textContent = t("coverMissing", null, pageLanguage);
                    }
                }
                hideFeedback(feedback);
            })
            .catch(function (error) {
                if (!isActivePage(pageRoot, runId)) {
                    return;
                }
                showFeedback(feedback, flattenError(error.payload) || t("deleteError", null, pageLanguage), "error");
            })
            .finally(function () {
                if (!isActivePage(pageRoot, runId)) {
                    return;
                }
                togglePageSkeleton(pageRoot, false);
            });

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            if (!isActivePage(pageRoot, runId)) {
                return;
            }

            hideFeedback(feedback);
            toggleButtonBusy(submitButton, true);

            request(buildApiDetailUrl(pageRoot.dataset.apiProducts, productId), {
                method: "DELETE",
                headers: { "X-CSRFToken": getCsrfToken() }
            })
                .then(function () {
                    if (!isActivePage(pageRoot, runId)) {
                        return;
                    }
                    navigateTo(buildIndexUrl(pageLanguage), { replace: true });
                })
                .catch(function (error) {
                    if (!isActivePage(pageRoot, runId)) {
                        return;
                    }
                    showFeedback(feedback, flattenError(error.payload) || t("deleteError", null, pageLanguage), "error");
                })
                .finally(function () {
                    if (isActivePage(pageRoot, runId)) {
                        toggleButtonBusy(submitButton, false);
                    }
                });
        });
    }

    function initializePage() {
        var pageRoot = syncRoot();
        if (!pageRoot) {
            return;
        }
        pageRunId += 1;
        var runId = pageRunId;
        var pageLanguage = normalizeLanguage(pageRoot.dataset.lang || language);

        if (pageRoot.dataset.page === "list") {
            renderListPage(pageRoot, pageLanguage, runId);
        }
        if (pageRoot.dataset.page === "detail") {
            renderDetailPage(pageRoot, pageLanguage, runId);
        }
        if (pageRoot.dataset.page === "form") {
            renderFormPage(pageRoot, pageLanguage, runId);
        }
        if (pageRoot.dataset.page === "delete") {
            renderDeletePage(pageRoot, pageLanguage, runId);
        }
    }

    if (!syncRoot()) {
        return;
    }

    bindNavigation();
    navigateTo(window.location.href, { replace: true, preserveScroll: true });
}());
