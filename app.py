from ctypes import sizeof
from flask import   (Flask, 
                    render_template, 
                    request,
                    send_from_directory)
from flask_bootstrap import Bootstrap
from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField
from wtforms.validators import DataRequired
import sys
sys.path.append('processing/TransitIsochroneTool')
import ExecSearch

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
    return render_template('home.html', form=form)

@app.route('/project', methods=['GET', 'POST'])
def project():
    if request.method == "POST":
        lat = request.form['lat']
        lon = request.form['lon']
        crs = request.form['crs']
        time_constraint = request.form['time']

        print(f"Lat :{lat}")
        print(f"Lon :{lon}")
        print(f"Crs :{crs}")
        print(f"Time constraint :{time_constraint}")

        start_loc = lat.__str__() + ',' + lon.__str__() + f' [{crs}]'
        print(start_loc)

        print("Starting isochrone search...")
        results = ExecSearch.run_isochrone(start_loc, time_constraint)
        
        return render_template('project.html', title=f"Search results - {lat}, {lon}", files=results)


        
    return render_template('project.html', title="Portland Transit Isochrone")

@app.route('/tmp/<path:filename>')
def serve_tmp_file(filename):
    print(f"filename is {filename}")
    return send_from_directory('/tmp', filename)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
