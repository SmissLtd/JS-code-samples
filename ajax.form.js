/*
 * data-type attribute should contain data type(or regular expression) for js validation, or attribbute should be omitted
 * data-error attribute can be set. If js validation will fail validateJsFile will be called with data-error value ad second argument
 * success() is callback function, which will be called after success form submit
 * validateJsFail([JQ object] element, [string] error) is callback, which will be called on js validation fail for specified element
 * to extend validation types, just add item in .regexp object
 * 
 * Callback funktions
 * - success()
 * 
 * 
 */
function AjaxForm(container, controller, options)
{
    var self = this;

    this.config = {
        controller: controller, // Controller

        container: container, // Container where form is(shuld not be empty)
        containerConfirm: "#confirm:first", // Container where save confirmation is
        containerError: "",
        errorTextContainer: "errors:first", // Container where error messages will display
        saveSuccess: "saveSuccess:first",
        commentField: "inputComment:first", // Texarea for comment in confirmation window
        classConfirm: "confirm", // Class of save changes window confirm button

        action: "", // Should support POST['validate'] to validate only

        closeContainer: "confirmClose:first", // Container where text for close question is
        classConfirmClose: "confirm-close:first", // Class of close window confirm button

        classIgnore: "ignore", // Forms having this class will be ignored(use for internal confirmation forms)

        classClose: "window-destroy", // Class of close window
        classCloseTab: "close-tab", // Class of close tab
        classHide: "window-close", // Class of hide window

        classFormGroup: "form-group", // Class which wrap form group element (label + field)

        classCreateHeader: "create-header", // Class of header for create form
        classEditHeader: "edit-header", // Class of header for edit form

        validateJs: true, // Validate or not using js validation
        validateAjax: true, // Validate or not using ajax validation
        submitAlways: false, // Ignore check for onChanges
        popup: false       // If true, container will be closed after final form submit
    };

    this.regexp = {
        email: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        login: /^[A-z0-9\_\-\.]+$/,
        first_name: /^[^0-9\,\/\_\)\(\*\?\:\%\;\#\№\!\@\"\^\+\{\}\[\]\\\>\<]*$/i,
        middle_name: /^[^0-9\,\/\_\)\(\*\?\:\%\;\#\№\!\@\"\^\+\{\}\[\]\\\>\<]*$/i,
        last_name: /^[^0-9\,\/\_\)\(\*\?\:\%\;\#\№\!\@\"\^\+\{\}\[\]\\\>\<]*$/i,
        integer: /^[-+]?[0-9]+$/,
        float: /^[-+]?[0-9]*\.?[0-9]+$/,
        text: /^[A-z0-9\_\-\.]+$/,
    };

    this.ignoreValidate = false;
    this.ignoreConfirm = false;
    this.formIndex = 1;
    this.ischanged = false;
    this.isfirst = false;
    this.saveIsProcessed = false;

    for (var prop in this.config)
    {
        if (prop in options)
            this.config[prop] = options[prop];
    }

    this.ajaxFail = function (jqXHR, textStatus, errorThrown) {
        self.saveIsProcessed = false;
        self.processAjaxErrors(jqXHR, textStatus, errorThrown);
        self.onFailSubmit(self);
    };

    this.success = function () {
    }; // Called when form submitted successfully(callback function)

    this.validateJsFail = function (element, error) { // Called when js validation is failed for element
        var errorContainer = self.config.container + ' #' + self.config.errorTextContainer;
        $(self.config.container + ' #' + self.config.saveSuccess).hide();
        $(errorContainer).html('<div class="col-sm-offset-2 col-sm-9">! ' + error + '</div>');
        element.parents('.' + self.config.classFormGroup + ':first').find('label.control-label').css('color', 'red');
        $(errorContainer).show();
        self.saveIsProcessed = false;
    };

    this.ajaxSuccess = function (data, form) {
        if (self.config.popup)
            self.closeForm(form);
        else
            $(self.config.container + ' #' + self.config.saveSuccess).show();

        self.ischanged = false;
        self.ignoreConfirm = false;
        this.ignoreValidate = false;

        $(self.config.container + ' ' + self.config.containerConfirm + ' textarea[name=comment]').val('');
        try 
        {
            var itemData = $.parseJSON(data);
            if(itemData.scenario == 'create' || itemData.scenario == 'add')
            {
                form.siblings('h3').find('.' + self.config.classCreateHeader).addClass('hidden');
                form.siblings('h3').find('.' + self.config.classEditHeader).removeClass('hidden');
            }

            form.parent().find('div[data-id="saveSuccessPartial"]').hide();
            if (itemData.statusFilling === 'partial')
            {
                form.parent().find('div[data-id="saveSuccessPartial"]').show();
            }
        }
        catch (e)
        {

        }

        self.onSuccessSubmit(data, form); // callback call
        self.success(data, form);
        self.saveIsProcessed = false;
    };

    this.closeForm = function (form) {
        form.closest('.window').remove();
    };

    this.ajaxValidateFail = function (jqXHR, textStatus, errorThrown) {
        self.processAjaxErrors(jqXHR, textStatus, errorThrown); // Called when error appear during ajax validation
        self.saveIsProcessed = false;
        self.onFailAjaxValidate();
    };

    this.ajaxValidateSuccess = function (form, data) { // Called when ajax validation finished without errors
        ajaxFinish();
        self.ignoreValidate = true;
        $(self.config.container + ' #' + self.config.errorTextContainer).hide();
        if (typeof (self.onSuccessAjaxValidate) == "function")
            self.onSuccessAjaxValidate(data);
        self.submit(true);
    };

    this.validateJsInput = function (type, val) { // Js validate element
        if (type)
        {
            if (type in self.regexp)
            {
                r = self.regexp[type];
            }
            else
            {
                r = new RegExp(type);
            }
            if (!r.test(val))
            {
                return false;
            }
        }
        return true;
    };

    this.validateJs = function (form) {
        var valid = true;
        self.errors = [];
        form.find("input[type='text']").each(function () {
            if (valid && !self.validateJsInput($(this).attr("data-type"), $(this).val()))
            {
                self.validateJsFail($(this), $(this).attr("data-error"));
                valid = false;
            }
        });
        form.find("input[type='password']").each(function () {
            if (valid && !self.validateJsInput($(this).attr("data-type"), $(this).val()))
            {
                self.validateJsFail($(this), $(this).attr("data-error"));
                valid = false;
            }
        });
        form.find("textarea").each(function () {
            if (valid && !self.validateJsInput($(this).attr("data-type"), $(this).val()))
            {
                self.validateJsFail($(this), $(this).attr("data-error"));
                valid = false;
            }
        });
        form.find("select:not(." + self.config.classIgnore + ")").each(function () {
            if (valid && !self.validateJsInput($(this).attr("data-type"), $(this).val()))
            {
                self.validateJsFail($(this), $(this).attr("data-error"));
                valid = false;
            }
        });
        return valid;
    };

    this.validateAjax = function (form) {
        ajaxStart();
        form.ajaxSubmit({
            url: "/" + self.config.controller + '/' + self.config.action,
            type: "POST",
            success: function (data) {
                self.ajaxValidateSuccess(form, data);
            },
            error: self.ajaxValidateFail,
            data: {validate: true}
        });
    };

    this.processAjaxErrors = function (jqXHR, textStatus, errorThrown) {
        var err = false,
                fieldsSelectors = [];

        try
        {
            err = eval("(" + jqXHR.responseText + ")");
        }
        catch (e)
        {
            var errorContainer = self.config.container + ' #' + self.config.errorTextContainer;
            $(errorContainer).append('<div class="col-sm-offset-2 col-sm-9">! ' + json[field][error] + '</div>');
            $(errorContainer).show();
            return false;
        }
        if (err.message)
        {
            errorContainer = self.config.container + ' #' + self.config.errorTextContainer;
            $(self.config.container + ' #' + self.config.saveSuccess).hide();
            $(errorContainer).html('');
            try {
                var json = $.parseJSON(err.message);
                message = "";
                for (var field in json)
                    for (var error in json[field]) {
                        if (json[field][error])
                            $(errorContainer).append('<div class="col-sm-offset-2 col-sm-9">! ' + json[field][error] + '</div>');
                        fieldsSelectors = [
                            self.config.container + " [name$='[" + field + "]']",
                            self.config.container + " [name$='[" + field + "][]']",
                            self.config.container + " [data-ajax_validation_field='" + field + "']"
                        ];
                        jQuery(fieldsSelectors.join(', ')).parents('.' + self.config.classFormGroup + ':first').find('label.control-label:not(.disabled)').css('color', 'red');
                    }
            }
            catch (e) {
                $(errorContainer).append('<span>' + err.message + '</span>');
            }
            $(errorContainer).show();
            $.centerPopup($(self.config.container));
        }
        else
        {
            ajaxErrorShow(jqXHR.status, errorThrown);
        }
    };

    this.submit = function (event) { // Called when form submiting

        var form = $(self.config.container + ' form');
        if (typeof event != "boolean" && !self.beforSubmit())
            return false;

        if (!self.config.submitAlways && !self.isfirst && !self.ischanged)
        {
            self.confirmedClose($(self.config.container + ' .window'));
            return false;
        }

        if (typeof event != "boolean")
        {
            if (self.saveIsProcessed)
                return false;
            self.saveIsProcessed = true;
            self.ignoreValidate = false;
        }
        form.find('label').css('color', '');
        form.find('span.required').remove();

        if (self.config.validateJs && !self.ignoreValidate)
        {
            if (!self.validateJs(form))
                return false;
        }
        if (self.config.validateAjax && !self.ignoreValidate)
        {
            self.validateAjax(form);
            return false;
        }

        if (self.config.containerConfirm && !self.ignoreConfirm)
        {
            var confirmForm = form.find(self.config.containerConfirm); // Search first inside form
            if (confirmForm.length == 0)
                confirmForm = form.parent().find(self.config.containerConfirm); // Search in parent

            confirmForm.find(" ." + self.config.classConfirm).prop('data-form', form.prop('data-form'));
            confirmForm.show();

            $.centerPopup($(self.config.container + " #" + self.config.classConfirm));
            $(self.config.container + " #" + self.config.classConfirm).draggable({handle: "h3:first"});

            self.showOverlay();
            return false;
        }

        ajaxStart();
        form.ajaxSubmit({
            url: "/" + self.config.controller + '/' + self.config.action,
            type: "POST",
            success: function (data) {
                self.ajaxSuccess(data, form);
            },
            error: self.ajaxFail
        });
        self.afterSubmit();
        return false;
    };

    this.showOverlay = function ()
    {
        $(self.config.container + ' .form-overlay:first').css('display', 'block');
    };

    this.hideOverlay = function ()
    {
        setTimeout(function () {
            if ($(self.config.container + ' .window:block').length == 0)
                $(self.config.container + ' .form-overlay:first').css('display', 'none');
        }, 5);
    };

    this.confirmed = function () { // Modify confirmed
        var form;
        var index = $(this).prop('data-form');
        if ($(self.config.container + ' ' + '#' + self.config.commentField).val().length > 0)
        {
            $(self.config.container + " form:not(." + self.config.classIgnore + ")").each(function ()
            {
                if ($(this).prop('data-form') == index)
                {
                    form = $(this);
                }
            });
            $(self.config.container + ' ' + self.config.containerConfirm).hide();
            self.ignoreConfirm = true;
            self.ignoreValidate = true;
            self.hideOverlay();
            self.submit(true);
        }
        else
        {
            $(self.config.container + ' ' + '#' + self.config.commentField).addClass('error-field');
            $(self.config.container + ' ' + '#' + self.config.commentField).focus(function () {
                $(this).removeClass('error-field');
            });
            self.hideOverlay();
        }
        return false;
    };

    this.close = function (el) { // Close confirm window
        if (self.ischanged)
        {
            $('.ui-autocomplete').hide();
            self.showOverlay();
            $(self.config.container + " #" + self.config.closeContainer).show();
            $.centerPopup($(self.config.container + " #" + self.config.closeContainer));
            $(self.config.container + " #" + self.config.closeContainer).draggable({handle: "h3:first"});
            return false;
        }
        else
        {
            self.confirmedClose($(el).closest('.window'));
        }
    };

    this.confirmedClose = function () {
        self.hideOverlay();
        self.onFormClose();
        self.closeForm($(self.config.container));
        return false;
    };

    this.changing = function () {
        if(!$(this).attr('readonly'))
        {
            self.onFormChanging();
            self.ischanged = true;
            if ($(self.config.container + " input[name='model[is_ready_to_publish]']").length > 0) {
                $(self.config.container + " input[name='model[is_ready_to_publish]']").removeAttr("disabled");
            }            
        }        
    };

    this.hide = function () { // Close window with unsave data
        $(self.config.container + ' ' + '#' + self.config.commentField).val('');
        self.saveIsProcessed = false;
        $(this).closest('.window').hide();
        self.hideOverlay();
    };
    
    //need to close save message when click on form
    this.hideSaveMessage = function() {
        $(self.config.container + " div[data-id='saveSuccessPartial']").hide();
        $(self.config.container + " div#saveSuccessPartial").hide();
        $(self.config.container + ' #' + self.config.saveSuccess).hide();
    };

    this.initialize = function () {
        if (self.config.action)
            $(self.config.container + " form:first:not(." + self.config.classIgnore + ")").on("submit", self.submit);

        if (self.config.containerConfirm && self.config.classConfirm)
            $(self.config.container + " " + self.config.containerConfirm + " ." + self.config.classConfirm).on("click", self.confirmed);

        if (self.config.classClose && self.config.closeContainer && self.config.classConfirmClose) {
            // form changes listers
            $(self.config.container + " form:first input, "
                    + self.config.container + " form:first textarea, "
                    + self.config.container + " form:first select").on("input, change, keyup", self.changing);
            $(self.config.container + " form:first select").on("change", self.changing);
            $(self.config.container + " form:first input").on("change", self.changing);
            $(self.config.container + " form:first input.hasDatepicker").on("mousedown", self.changing);
            $(self.config.container + ">h3 ." + self.config.classClose + ", " + self.config.container + " .btn." + self.config.classClose).on("click", self.close);
            $(self.config.container + ">#" + self.config.closeContainer + " ." + self.config.classConfirmClose + ", " + self.config.container + ">form>#" + self.config.closeContainer + " ." + self.config.classConfirmClose).on("click", self.confirmedClose);
        }

        if (self.config.classHide)
            $(self.config.container + " ." + self.config.classHide).on("click", self.hide);
        
        $(self.config.container).on("click", self.hideSaveMessage);
        

        $.themingInputs($(self.config.container));
    };

    this.initialize();

    // callbacks
    this.beforSubmit = function () {
        return true;
    };
    this.afterSubmit = function () {
        return true;
    };
    this.onSuccessSubmit = function () {
    };
    this.onFailSubmit = function () {
    };
    this.onFormClose = function () {
    };
    this.onSucessAjaxValidate = function (data) {
    };
    this.onFailAjaxValidate = function () {
    };
    this.onFormChanging = function () {
    };
}