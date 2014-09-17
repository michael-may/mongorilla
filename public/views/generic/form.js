define('views/generic/form', [
        'third-party/ladda-bootstrap/dist/ladda.min',
        'third-party/jsSHA/src/sha1.js',
        'third-party/bootstrap-datepicker/js/bootstrap-datepicker',
        'third-party/bs-fancyfile/js/bootstrap-fancyfile.min',
        'third-party/ckeditor/ckeditor',
        'third-party/twitter-bootstrap-typeahead/js/bootstrap-typeahead',

        'backbone-forms/editors/list',
        'backbone-forms/editors/file',
        'backbone-forms/editors/image',
        'backbone-forms/editors/object-id',
        'backbone-forms/editors/ckeditor',
        'backbone-forms/editors/datepicker',

        'third-party/backbone-forms/distribution/templates/bootstrap3',
    ], function (Ladda, jsSHA) {

    return Backbone.View.extend({

        events: {
            'click .submit': 'submit',
            'click .submit-draft': 'submitDraft',
            'click .remove': 'remove',
        },

        page: '',

        initialize: function (options) {
            var instance = this;

            page = options.page;
            instance.collectionName = options.collectionName;
            instance.objectId = options.objectId;

            instance.setElement($('#form-controls').get(0));

            require([
                'models/' + instance.collectionName, 
                'forms/' + instance.collectionName,
                'json!/config/' + instance.collectionName + '.json',
                'json!/api/' + instance.collectionName + '/' + (instance.objectId||'default'),
                ], function (Model, Form, config, modelData) {

                
                var schema = Form.prototype.schema; // force the schema against the model one

                // Filter out any fields that shouldn't be in this view
                // Usage Example:
                /* "password": { 
                        "type": "Password", 
                        "title": "Password", 
                        "validators": ["required"], 
                        "editorAttrs": { "placeholder": "password" },
                        "conditionals": {
                            "page": {
                                "edit": {
                                    "hidden": true
                                }
                            }
                        }
                    }
                */
                if( schema ) {
                    $.each(schema, function(key, field) {
                        if( field.conditionals && field.conditionals.page && field.conditionals.page[options.page] ) {
                            // Check if we should remove this field
                            if ( field.conditionals.page[options.page].hidden ) {
                                // Should be hidden
                                delete schema[key];
                                delete config.schema[key];
                            }
                        }else{
                            // No conditionals
                        }
                    });
                }

                instance.config = config;
                instance.model = new Model(modelData);
                instance.form = new Form({
                    model: instance.model,
                    fieldsets: instance.config.fieldsets,
                    schema: schema 
                });

                $('#collection-form').html(instance.form.render().$el);

                // prevent undesired form submissions
                $('#collection-form').on('submit', function (event) { event.preventDefault(); })

                instance.renderFormControls();
                if (instance.objectId) {
                    instance.renderRevisionsControls();
                }

                if (!instance.model.isNew()) {
                    instance.bindModelEvents();
                }

            });

            if (instance.$el.data('readonly')) {
                $('.submit, .remove', instance.$el).attr('disabled', 'disabled');
            }
        },

        render: function () {
        },

        renderFormControls: function () {
            var instance = this;
            var controlsHtml = '';
            if (instance.objectId && $('[data-permission-d]').size()) {
                controlsHtml +='<button class="btn btn-danger btn-lg remove ladda-button" data-style="expand-right"><i class="fa fa-times"></i> Delete</button>';
            }
            instance.$('.left').html(controlsHtml);

            var controlsHtml = '';
            if ($('[data-permission-u], [data-permission-c]').size()) {
                if (instance.objectId) {
                    controlsHtml += '<button class="btn btn-primary btn-lg submit-draft ladda-button" data-style="expand-right"><i class="fa fa-star"></i> Save draft</button>';
                }
                controlsHtml += '<button class="btn btn-primary btn-lg submit ladda-button" data-style="expand-right"><i class="fa fa-pencil"></i> ' + (instance.objectId ? 'Save & Publish' : 'Create') + '</button>';
            }
            if (!instance.model.isNew()) {
                controlsHtml += '<a class="btn btn-info btn-lg preview" href="/preview/'
                    + instance.collectionName + '/' + instance.objectId + '" target="_blank"><i class="fa fa-eye"></i> View</a>';
            }
            instance.$('.right').html(controlsHtml);

            instance.laddaSubmit = Ladda.create(instance.$('.submit').get(0));
            instance.laddaSubmitDraft = Ladda.create(instance.$('.submit-draft').get(0));
            instance.laddaRemove = Ladda.create(instance.$('.remove').get(0));
        },

        renderRevisionsControls: function () {
            var instance = this;
            $('[data-collection-tostringfield]').html(instance.model.toString());
            $('[data-created]').html(humaneDate(instance.model.get(instance.config.createdField.key)));
            $('[data-updated]').html(humaneDate(instance.model.get(instance.config.updatedField.key)));

            // TODO convert revisionsModel into a collection and handle it with async events
            require([
                'views/generic/revisions/timeline',
                'json!/api/' + instance.collectionName + '/' + instance.objectId + '/revisions?t=' + Math.random()
                ], function (GenericFormRevisionsView, revisionsModel) {

                instance.revisionsView = new GenericFormRevisionsView({
                    model: instance.model,
                    revisionsModel: revisionsModel,
                    config: instance.config
                });
                instance.revisionsView.render();
            });
        },

        submit: function (event) {
            var instance = this;
            var err;
            if (!(err = instance.form.validate())) {
                // If we have a password field, hash the input
                // TODO hash this in the serialized data so we don't flash the hash in the form
                if(instance.collectionName == 'mongorillaUser') {
                    if(page == 'create') {
                        var hash = new jsSHA($('[name="password"]', instance.form.$el).val(), 'TEXT').getHash('SHA-1', 'HEX');
                        $('[name="password"]', instance.form.$el).val(hash);
                    } else if(page == 'edit') {
                        var hash = new jsSHA($('[name="newpassword"]', instance.form.$el).val(), 'TEXT').getHash('SHA-1', 'HEX');
                        $('[name="newpassword"]', instance.form.$el).val(hash);
                    }
                }
                
                instance.laddaSubmit.start();
                alertify.prompt('Please, enter a revision description:', function (ok, description) {
                    if (!ok) {
                        instance.laddaSubmit.stop();
                        return;
                    }
                    if (instance.revisionsView) {
                        instance.revisionsView.pushRevision(false);
                    }
                    if (!(err = instance.form.commit())) {
                        var isNew = instance.model.isNew();
                        instance.model.save({}, {
                            silent: true,
                            url: instance.model.url() + '?description=' + encodeURIComponent(description),
                            success: function () {
                                instance.laddaSubmit.stop();
                                alertify.success('success!');
                                if (isNew) {
                                    document.location.href = '/edit/' + instance.collectionName + '/' + instance.model.id;
                                } else {
                                    if (instance.revisionsView) {
                                        require([
                                            'json!/api/' + instance.collectionName + '/' + instance.objectId + '/revisions?t=' + Math.random()
                                            ], function (revisionsModel) {
                                            instance.revisionsView.revisionsModel = revisionsModel;
                                            instance.revisionsView.render(); // repaint view
                                        });
                                    }
                                    $('[data-updated]').html(humaneDate(instance.model.get(instance.config.updatedField.key)));
                                }
                            },
                            error: function () {
                                instance.laddaSubmit.stop();
                                alertify.error('an error has ocurred! :S');
                            }
                        });
                    } else {
                        instance.laddaSubmit.stop();
                        console.log('model err', err);
                        alertify.error('validation failed, look at the console for details.');
                    }
                });
            }
        },

        submitDraft: function (event) {
            var instance = this;
            var err;
            if (!(err = instance.form.validate())) {
                instance.laddaSubmitDraft.start();
                alertify.prompt('Please, enter a revision description:', function (ok, description) {
                    if (!ok) {
                        instance.laddaSubmitDraft.stop();
                        return;
                    }
                    if (instance.revisionsView) {
                        instance.revisionsView.pushRevision(false);
                    }
                    if (!(err = instance.form.commit())) {
                        require(['models/' + instance.collectionName + '-revision', ], function (RevisionModel) {
                            var revision = new RevisionModel({ description: description, snapshot: instance.model.toJSON() });
                            revision.save({}, {
                                silent: true,
                                url: revision.urlRoot.replace(/:objectId/, instance.objectId),
                                success: function () {
                                    instance.laddaSubmitDraft.stop();
                                    alertify.success('success!');
                                        if (instance.revisionsView) {
                                            require([
                                                'json!/api/' + instance.collectionName + '/' + instance.objectId + '/revisions?t=' + Math.random()
                                                ], function (revisionsModel) {
                                                instance.revisionsView.revisionsModel = revisionsModel;
                                                instance.revisionsView.render(); // repaint view
                                                instance.revisionsView.repaintList(0); // put the mark on the current rev
                                            });
                                        }
                                        $('[data-updated]').html(humaneDate(instance.model.get(instance.config.updatedField.key)));
                                },
                                error: function () {
                                    instance.laddaSubmitDraft.stop();
                                    alertify.error('an error has ocurred! :S');
                                }
                            });
                        });
                    } else {
                        instance.laddaSubmitDraft.stop();
                        console.log('model err', err);
                        alertify.error('validation failed, look at the console for details.');
                    }
                });
            }
        },

        remove: function (event) {
            var instance = this;
            instance.laddaRemove.start();
            alertify.confirm('Are you sure you want to delete this '+ instance.collectionName, function (ok) {
                instance.laddaRemove.stop();
                if (ok) {
                    instance.model.destroy({
                        success: function () {
                            document.location.href = '/search/' + instance.collectionName;
                        }
                    });
                }
            });
        },

        /* adds compatibility to form refreshing on model change */
        bindModelEvents: function () {
            var instance = this;
            instance.model.on('change', function(model) {
                _(instance.config.schema).each(function (schema, prop) {
                    if (!model.hasChanged(prop)) {
                        return;
                    }
                    var obj = {};
                    obj[prop] = model.get(prop);
                    instance.form.setValue(obj);
                });
            });
        },

    });

});
