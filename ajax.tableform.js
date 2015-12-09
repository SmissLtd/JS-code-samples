function AjaxTableForm(container, controller, tableOptions, formCreateOptions, formModifyOptions, commonFormOptions)
{   
    var self = this;
    var hideOverlayTimeOut = false;
    this.config = {
        controller: controller, // Controller
        container:  container,  // Container where form is(shuld not be empty)
        activeTabSelector: '.nav-tabs li.active a',
        popupIDPart : '#popup', 
        formIndex:  1,
        popupInit: true,
        tabsInit: false,
        nokeypress: false
    }
    this.tabsStack = [];
    this.formModifyOptions = formModifyOptions;
    this.formCreateOptions = formCreateOptions;
    //=== Initialise Popup
    this.initForm = function (container, id, data)
    {
        var popupContainer = self.config.popupIDPart + id;
        var formContainer  = container + ' ' + popupContainer;
        
        self.table.showOverlay();
        $(container).append('<div id="' + popupContainer.replace('#', '') + '" class="window" style="left: -2000px;!important">' + data + '</div>');
        $(formContainer).show();
        $.centerPopup($(formContainer));
        $($(formContainer)).draggable({handle: "h3"});
    }
    
    this.closeForm = function (id)
    {
        $(self.form.config.container).remove();
        
        if (formModifyOptions.onSuccess)
            formModifyOptions.onSuccess();
       
        self.table.hideOverlay();
        delete self.form;
        
    }
    
    //=== initialize tab container 
    this.initTab = function(id, data) 
    {
        var tabContainer = self.config.popupIDPart + id;
        // create new tab 
        $(self.table.config.containerCreate + ' .tab-header').append(
            $('<li id="tab-li-' + id + '" class="tabnew"><a href="' + tabContainer + '" data-id="' + id + '"></a></li>'));
        
        // create content container 
        $(self.table.config.containerCreate + ' .tab-content').append(
            $('<div id="' + tabContainer.replace('#', '') + '" class="tab-pane window" style="left: -2000px;!important">' + data + '</div>'));

        $.centerPopup($(tabContainer), 100);
        $('#tab-li-' + id + ' a').tab('show');
        $($(tabContainer)).draggable({handle: "h3"});
        
        self.table.showOverlay();
        self.getTabName(id);
    }
    
    this.getTabName = function(id) { // Set tabs name. Should be called after success create/modify action
        ajax({
            url: "/" + self.table.config.controller + "/tabsname",
            type: "POST",
            data: {id: id, addInfo: $(self.config.popupIDPart + id + " input[name='addInfo']").val()},
            error: self.table.ajaxFail,
            success: function (tabName) { 
                $('#tab-li-' + id + ' a').html(tabName + '<span class="close">×</span>');
                $('#tab-li-' + id + ' a .close').on('click', self.tabsStack[id].close);
            }
        });
        return false;
    }

    this.closeTab = function(id) 
    {
        // reload table data if is changed form 
        if (self.tabsStack[id].ischanged)
            self.table.reload();
        
        // remove elements
        $(self.tabsStack[id].config.container).remove();
        $('.nav-tabs li#tab-li-' + id).remove();
        
        //show table
        $(self.config.container + ' .nav-tabs li.showTable a').tab('show');
        
        //select active tab (table)
        $('.nav-tabs li.showTable').addClass('active');
        
        self.hideOverlay();
        delete self.tabsStack[id];
        this.afterCloseTab(id);
    }
    
    //=== Init inner popup 
    this.initFormInnerPopup = function (container, popupId, data)
    {
        var  popupIdentifier = container + ' #' +  popupId;
        $(container).append('<div id="' + popupId + '" class="window" style="left: -2000px;!important">' + data + '</div>');
        
        $.centerPopup($(popupIdentifier));
        $(popupIdentifier).show();
        $($(popupIdentifier)).draggable({handle: "h3"});
        
        if (!self.config.tabsInit)
            self.form.showOverlay();
        else
            $(container).parents('div.window').find('.form-overlay:first').css('display', 'block');
        
        $(popupIdentifier + " .window-destroy").on("click", function () {
            self.closeFormInnerPopup(container, popupId);
        });
    }
    
    this.closeFormInnerPopup = function (container, popupId)
    {
        $(container + ' #' +  popupId).remove();
        if (!self.config.tabsInit)
            self.form.hideOverlay();
        else
            $(container).parents('div.window').find('.form-overlay:first').css('display', 'none');
    }
    
    this.ajaxSuccess = function(data) 
    {
        $(self.table.config.container).html(data);
        $.themingInputs($(self.table.config.container));
        self.table.reload();
        self.table.hideOverlay();
    };
    
    this.successCreateReload = function(data, formId)
    {
        self.table.reload();
        $.hideOverlay();
        if (data !== '')
        {
            var itemData = $.parseJSON(data);
            if (typeof itemData === 'object' && itemData.hasOwnProperty('id'))
            {
                if (!self.config.tabsInit)
                {
                    if ((itemData.id || itemData.id === 0) && typeof self.form !== 'undefined' && $(self.form.config.container + ' input[name="id"]'))
                    {
                        self.form.config.action = self.formModifyOptions.action;
                        $(self.form.config.container + ' input[name="id"]').val(itemData.id);
                    }
                }
                else
                {
                    if (itemData.id && $(self.tabsStack[formId].config.container + ' input[name="id"]'))
                    {
                        self.tabsStack[formId].config.action = self.formModifyOptions.action;
                        $(self.tabsStack[formId].config.container + ' input[name="id"]').val(itemData.id);
                    }

                }
            }
        }
    }
    
    this.ajaxSuccessCreate = function(data, callback)
    {
        var formId = "create" + self.config.formIndex;
        var formContainer = self.config.popupIDPart + formId;
        var containerCreate = self.config.container + ' ' + self.table.config.containerCreate;
        
        if (!self.config.tabsInit)
        {
            // popup should not disappear after a successful get data
            formCreateOptions.popup = false;
            
            self.initForm(containerCreate, formId, data);
            self.form = new AjaxForm(containerCreate + ' ' + formContainer, controller, formCreateOptions);
            self.form.closeForm = self.closeForm;
            self.form.ignoreConfirm = true;
            self.form.isfirst       = true;
            self.form.success       = function (data) {self.successCreateReload(data, formId);}
            setUniqueCheckboxIds(self.form.config.container);
        }
        else
        {
            self.initTab(formId, data);
            formCreateOptions.popup = false;
            self.tabsStack[formId] = new AjaxForm(containerCreate + ' ' + formContainer, controller, formCreateOptions);
            self.tabsStack[formId].closeForm = function () { self.closeTab(formId); }
            self.tabsStack[formId].isfirst = true;
            self.tabsStack[formId].ignoreConfirm = true;
            self.tabsStack[formId].success = function (data) {self.successCreateReload(data, formId);}
            setUniqueCheckboxIds(self.tabsStack[formId].config.container);
        }   
       
        // callback
        if (typeof(callback) === "function")
            callback(formId);
        else
            self.formCreateInit(formId);
        self.showOverlay();
        
        // increst counters
        self.config.formIndex++;
        self.table.config.formIndex = self.config.formIndex;
    };
    
    this.ajaxSuccessModify = function(id, data, callback)
    {
        var formContainer = self.config.popupIDPart + id;
        var containerModify = self.config.container + ' ' + self.table.config.containerModify;
        if (!self.config.tabsInit)
        {
            // popup should not disappear after a successful get data
            formModifyOptions.popup = false;
            
            self.initForm(containerModify, id, data);
            self.form = new AjaxForm(containerModify + ' ' + formContainer, controller, formModifyOptions);
            self.form.ignoreConfirm = false;
            self.form.isfirst = false;
            self.form.closeForm = self.closeForm;
            self.form.success   = self.success;
            setUniqueCheckboxIds(self.form.config.container);
        }
        else
        {
            if ($(containerModify + ' ' + formContainer).length > 0)
            {
                self.showOverlay();
                return $('.nav-tabs li#tab-li-' + id + ' a').tab('show');
            }
            self.initTab(id, data);
            formModifyOptions.popup = false;
            self.tabsStack[id] = new AjaxForm(containerModify + ' ' + formContainer, controller, formModifyOptions);
            self.tabsStack[id].isfirst = false;
            self.tabsStack[id].ignoreConfirm = false;
            self.tabsStack[id].closeForm = function () { self.closeTab(id); }
            self.tabsStack[id].success   = self.success;
            setUniqueCheckboxIds(self.tabsStack[id].config.container);
        }
        
        if (typeof(callback) === "function")
            callback(id);
        else
            self.formModifyInit(id);
        self.showOverlay();
    };
    
    this.success = function(answ){
        // call user success function
        if((typeof commonFormOptions !== 'undefined') && (typeof commonFormOptions.ajaxSuccess === 'function'))
        {        
            var ajaxSuccessSelf = typeof commonFormOptions.ajaxSuccessSelf === 'object' ? commonFormOptions.ajaxSuccessSelf : this;
            commonFormOptions.ajaxSuccess.call(ajaxSuccessSelf,answ);
        }
        
        self.table.reload();
        $.hideOverlay();
    };
    
    this.filterAll = function(fields) 
    {
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionFilter,
            type: "POST",
            data: {
                fields: fields
            },
            error: self.ajaxFail,
            success: self.ajaxSuccess
        });
        return false;
    };
    
    // global keypress processing [need improvment!!!!!!]
    this.keypressInit = function ()
    {
        $(document).on('keyup', function(event) {
            switch (event.which) {
                case 27 :
                    $(self.config.container + ' .window:block:last span.close').click();
                    break;
                default :
                    break;
            }
        });
    }
    
    this.showOverlay = function()
    {
        if (this.hideOverlayTimeOut !== false)
        {
            clearTimeout(this.hideOverlayTimeOut);
            this.hideOverlayTimeOut = false;
        }
        $(self.config.container + ' .table-overlay:first').css('display', 'block');
    };
    
    this.hideOverlay = function()
    {
        this.hideOverlayTimeOut = setTimeout(function() 
        {
            $(self.config.container + ' .table-overlay:first').css('display', 'none');
            this.hideOverlayTimeOut = false;
        }, 5);
    };
    
    this.initialize = function() 
    {
        tableOptions.parentContainer = self.config.container;
        self.table = new AjaxTable(container + ' #table:first', controller, tableOptions);
        
        // on create form init
        self.table.ajaxSuccessCreate = self.ajaxSuccessCreate;

        // on modify form init
        self.table.ajaxSuccessModify = self.ajaxSuccessModify;
        
        // add blocker to duble click
        self.table.beforeCreate = self.table.beforeModify = function() {
            if (self.table.isCreateingFormNow)
                return false;
            
            self.table.isCreateingFormNow = true;
            return true;
        }
        self.table.afterCreate = self.table.afterModify = function() {
            self.table.isCreateingFormNow = false;
        }
        
        if (!self.config.tabsInit)
            $(self.config.container + " .nav-tabs").on("click", "a", function(e) {
                e.preventDefault();
                
                if ($(this).attr('href') == '#table')
                   self.hideOverlay(); 
                else 
                   self.showOverlay();
               
                $(this).tab('show');
            });
        
        if (!self.config.nokeypress)
            self.keypressInit()
  
    }
    
    this.initialize();
    
    // callback function
    this.formCreateInit = function() {}; 
    this.formModifyInit = function() {};
    this.afterCloseTab = function(id) {};
}