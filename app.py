from flask import Flask, render_template
from flask_bootstrap import Bootstrap
from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField
from wtforms.validators import DataRequired
from pyHelloWorld import printString

app = Flask(__name__)
app.config['SECRET_KEY'] = 'hard to guess string'

bootstrap = Bootstrap(app)


class printForm(FlaskForm):
    string = StringField('What should be printed?', validators=[DataRequired()])
    submit = SubmitField('Submit')



@app.route('/', methods=['GET', 'POST'])
def index():
    string = None
    form = printForm()
    if form.validate_on_submit():
        string = form.string.data
        form.string.data = ''
        printString(string)
    return render_template('home.html', form=form)

@app.route('/project', methods=['GET'])
def project():
    return render_template('project.html', title="boobah")

if __name__ == "__main__":
    app.run(debug=True)
