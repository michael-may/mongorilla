define('views/login/form', [
        'third-party/ladda-bootstrap/dist/ladda.min',
        'third-party/jsSHA/src/sha1.js'
    ], function (Ladda, jsSHA) {

    return Backbone.View.extend({

        events: {
            'submit': 'submit',
            'click #submit-guest': 'signinAsGuest',
        },

        initialize: function (options) {
            var instance = this;
            instance.setElement($('form').get(0));
            instance.$('[type="submit"]').removeAttr('disabled');
            instance.$('#submit-guest').removeAttr('disabled');
            instance.laddaSubmit = Ladda.create(this.$el.find('[type="submit"]').get(0));
        },

        render: function () {
        },

        submit: function (event) {
            var instance = this;
            var hash = new jsSHA(instance.$('[name="pass"]').val(), 'TEXT').getHash('SHA-1', 'HEX');
            event.preventDefault();

            //instance.$('[name="pass"]').val(hash);
            instance.laddaSubmit.start();
            $.ajax({
                    method: 'POST',
                    url: instance.$el.attr('action'),
                    data: instance.$el.serialize()
                })
                .success(function (data) {
                    alertify.success('<i class="glyphicon glyphicon-ok"></i> <span class="col-sm-offset-1">Welcome, <strong>' + data.user.fullname + '</strong></span>!');
                    instance.$el.fadeOut(1000, function () {
                        instance.laddaSubmit.stop();
                        document.location = '/dashboard';
                    });
                })
                .error(function (data) {
                    instance.laddaSubmit.stop();
                    instance.$('.alert').remove();
                    instance.$el.prepend('<div class="alert alert-danger"><i class="glyphicon glyphicon-remove"></i> Invalid credentials.</div>');
                    alertify.error('<i class="glyphicon glyphicon-remove"></i> <span class="col-sm-offset-1">Unable to perform login, please verify your credentials.</span>')
                })
        },

        signinAsGuest: function (event) {
            var instance = this;
            event.preventDefault();
            instance.$('[name="user"]').val('admin');
            instance.$('[name="pass"]').val('123');
            instance.submit(event);
        },

    });

});
